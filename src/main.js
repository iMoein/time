import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { createElement: h } = React;

const accentPalette = ['#f97316', '#7c3aed', '#2563eb', '#db2777', '#059669', '#0891b2', '#ea580c', '#4f46e5'];

const defaultCities = [
  { id: 'tehran', label: 'Tehran', country: 'Iran', timeZone: 'Asia/Tehran', latitude: 35.6892, longitude: 51.3890, accent: accentPalette[0] },
  { id: 'los-angeles', label: 'Los Angeles', country: 'United States', timeZone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437, accent: accentPalette[1] },
  { id: 'london', label: 'London', country: 'United Kingdom', timeZone: 'Europe/London', latitude: 51.5072, longitude: -0.1276, accent: accentPalette[2] },
  { id: 'paris', label: 'Paris', country: 'France', timeZone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522, accent: accentPalette[3] },
  { id: 'tokyo', label: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503, accent: accentPalette[4] },
  { id: 'dubai', label: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai', latitude: 25.2048, longitude: 55.2708, accent: accentPalette[5] },
];

const savedCitiesKey = 'time-app-cities';
const savedNtpHostKey = 'time-app-ntp-host';
const defaultNtpHost = 'ntp.time.ir';

function toTitleCase(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeCityFromTimeZone(timeZone, index) {
  const pieces = timeZone.split('/');
  const rawLabel = pieces[pieces.length - 1] || timeZone;
  const region = pieces.length > 1 ? toTitleCase(pieces[0]) : 'World';

  return {
    id: timeZone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    label: toTitleCase(rawLabel),
    country: region,
    timeZone,
    accent: accentPalette[index % accentPalette.length],
  };
}

function getAllCities() {
  const supportedTimeZones = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone').filter((timeZone) => timeZone.includes('/'))
    : [];
  const generatedCities = supportedTimeZones.map(makeCityFromTimeZone);
  const cityMap = new Map(generatedCities.map((city) => [city.timeZone, city]));

  defaultCities.forEach((city) => cityMap.set(city.timeZone, city));

  return [...cityMap.values()].sort((a, b) => a.label.localeCompare(b.label));
}

const allCities = getAllCities();
const allCityIds = new Set(allCities.map((city) => city.id));
const defaultCityIds = defaultCities.map((city) => city.id);

function getInitialNtpHost() {
  return localStorage.getItem(savedNtpHostKey) || defaultNtpHost;
}

function getInitialCityIds() {
  const savedValue = localStorage.getItem(savedCitiesKey);

  if (!savedValue) {
    return defaultCityIds;
  }

  try {
    const parsedIds = JSON.parse(savedValue);
    const savedIds = Array.isArray(parsedIds) ? parsedIds.filter((id) => allCityIds.has(id)) : [];
    return savedIds.length ? savedIds : defaultCityIds;
  } catch {
    return defaultCityIds;
  }
}

function getTimeParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function formatTime(date, timeZone, withSeconds = true) {
  const { hour, minute, second } = getTimeParts(date, timeZone);
  return withSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
}


function padClockPart(value) {
  return String(value).padStart(2, '0');
}

function formatMinutesAsTime(totalMinutes) {
  const normalizedMinutes = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return `${padClockPart(hours)}:${padClockPart(minutes)}`;
}

function formatDuration(totalMinutes) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}hr`;
  }

  return `${hours}hr ${minutes}min`;
}

function getMinuteOfDay(date, timeZone) {
  const { hour, minute, second } = getTimeParts(date, timeZone);
  return Number(hour) * 60 + Number(minute) + Number(second) / 60;
}

function getSolarY(minute, sunrise, sunset, horizonY, peakY, nightY) {
  if (minute >= sunrise && minute <= sunset) {
    const daylightProgress = (minute - sunrise) / (sunset - sunrise);
    return horizonY - Math.sin(daylightProgress * Math.PI) * (horizonY - peakY);
  }

  const nightProgress = minute < sunrise
    ? (minute + (1440 - sunset)) / (1440 - sunset + sunrise)
    : (minute - sunset) / (1440 - sunset + sunrise);

  return horizonY + Math.sin(Math.min(1, nightProgress) * Math.PI) * (nightY - horizonY);
}

function buildSolarPath({ sunrise, sunset, horizonY, peakY, nightY }) {
  const points = [];

  for (let minute = 0; minute <= 1440; minute += 20) {
    const x = (minute / 1440) * 1000;
    const y = getSolarY(minute, sunrise, sunset, horizonY, peakY, nightY);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return points.join(' ');
}

function getDayOfYear(date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date - startOfYear) / 86400000);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const zonedUtcTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return (zonedUtcTime - date.getTime()) / 60000;
}

function getSolarEventMinutes(cityDate, timeZone, latitude, longitude, zenith) {
  const dayOfYear = getDayOfYear(cityDate);
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const equationOfTime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
  const declination = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const latitudeRad = toRadians(latitude);
  const hourAngleInput = (Math.cos(toRadians(zenith)) / (Math.cos(latitudeRad) * Math.cos(declination)))
    - Math.tan(latitudeRad) * Math.tan(declination);

  if (hourAngleInput < -1 || hourAngleInput > 1) {
    return null;
  }

  const hourAngle = toDegrees(Math.acos(hourAngleInput));
  const offsetMinutes = getTimeZoneOffsetMinutes(cityDate, timeZone);
  const sunrise = 720 - 4 * (longitude + hourAngle) - equationOfTime + offsetMinutes;
  const sunset = 720 - 4 * (longitude - hourAngle) - equationOfTime + offsetMinutes;

  return { sunrise, sunset };
}

function getSolarSchedule(date, city) {
  const fallback = { firstLight: 330, sunrise: 360, sunset: 1080, lastLight: 1110, estimated: true };

  if (typeof city.latitude !== 'number' || typeof city.longitude !== 'number') {
    return fallback;
  }

  const cityDate = getCityDate(date, city.timeZone);
  const daylight = getSolarEventMinutes(cityDate, city.timeZone, city.latitude, city.longitude, 90.833);
  const twilight = getSolarEventMinutes(cityDate, city.timeZone, city.latitude, city.longitude, 96);

  if (!daylight || !twilight) {
    return fallback;
  }

  return {
    firstLight: twilight.sunrise,
    sunrise: daylight.sunrise,
    sunset: daylight.sunset,
    lastLight: twilight.sunset,
    estimated: false,
  };
}

function getDayNightData(date, city) {
  const currentMinute = getMinuteOfDay(date, city.timeZone);
  const { firstLight, sunrise, sunset, lastLight, estimated } = getSolarSchedule(date, city);
  const isDaylight = currentMinute >= sunrise && currentMinute < sunset;
  const isTwilight = !isDaylight && currentMinute >= firstLight && currentMinute < lastLight;
  const nextSunrise = currentMinute < sunrise ? sunrise : sunrise + 1440;
  const nextSunset = currentMinute < sunset ? sunset : sunset + 1440;
  const daylightDuration = sunset - sunrise;
  const remainingMinutes = isDaylight ? sunset - currentMinute : nextSunrise - currentMinute;
  const status = isDaylight ? 'Daylight remaining' : isTwilight ? 'Twilight' : 'Night remaining';
  const eventLabel = isDaylight ? 'Sunset' : 'Sunrise';
  const eventTime = isDaylight ? sunset : nextSunrise;
  const horizonY = 160;
  const peakY = 48;
  const nightY = 208;
  const currentY = getSolarY(currentMinute, sunrise, sunset, horizonY, peakY, nightY);

  return {
    currentX: (currentMinute / 1440) * 1000,
    currentY,
    daylightDuration,
    eventLabel,
    eventTime: formatMinutesAsTime(eventTime),
    firstLight: formatMinutesAsTime(firstLight),
    isDaylight,
    isTwilight,
    lastLight: formatMinutesAsTime(lastLight),
    remaining: formatDuration(remainingMinutes),
    status,
    sunPath: buildSolarPath({ sunrise, sunset, horizonY, peakY, nightY }),
    sunrise: formatMinutesAsTime(sunrise),
    sunset: formatMinutesAsTime(sunset),
    totalDaylight: formatDuration(daylightDuration),
    isEstimated: estimated,
  };
}

function getZonedDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getWeekNumber(date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
}

function getCityDate(date, timeZone) {
  const parts = getZonedDateParts(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}


function getPersianDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US-u-nu-latn', {
    timeZone,
    calendar: 'persian',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal' && part.type !== 'era').map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getPersianWeekNumber(date, timeZone) {
  const { month, day } = getPersianDateParts(date, timeZone);
  const dayOfYear = month <= 6
    ? (month - 1) * 31 + day
    : 186 + (month - 7) * 30 + day;

  return Math.ceil(dayOfYear / 7);
}


const dayInMilliseconds = 86400000;
const gregorianWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const persianWeekdays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * dayInMilliseconds);
}

function addUtcMonths(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12));
}

function getCalendarDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isSameUtcDay(firstDate, secondDate) {
  return firstDate.getUTCFullYear() === secondDate.getUTCFullYear()
    && firstDate.getUTCMonth() === secondDate.getUTCMonth()
    && firstDate.getUTCDate() === secondDate.getUTCDate();
}

function getMonthGridStart(date, firstDayOfWeek) {
  const dayOffset = (date.getUTCDay() - firstDayOfWeek + 7) % 7;
  return addUtcDays(date, -dayOffset);
}

function getWeekStartDate(date, firstDayOfWeek) {
  return getMonthGridStart(date, firstDayOfWeek);
}

function formatGregorianWeekDate(date) {
  return `${formatNumber(date.getUTCMonth() + 1)}/${formatNumber(date.getUTCDate())}`;
}

function formatPersianWeekDate(date) {
  const { month, day } = getPersianDatePartsFromUtc(date);
  return `${formatNumber(month)}/${formatNumber(day)}`;
}

function getWeeklyCalendar(date, timeZone, calendar) {
  const cityDate = getCityDate(date, timeZone);
  const startsOnSaturday = calendar === 'persian';
  const startDate = getWeekStartDate(cityDate, startsOnSaturday ? 6 : 1);
  const weekdays = startsOnSaturday ? persianWeekdays : gregorianWeekdays;
  const formatter = startsOnSaturday ? formatPersianWeekDate : formatGregorianWeekDate;

  return weekdays.map((weekday, index) => {
    const dayDate = addUtcDays(startDate, index);

    return {
      id: `${calendar}-${getCalendarDateKey(dayDate)}`,
      weekday,
      date: formatter(dayDate),
      isToday: isSameUtcDay(dayDate, cityDate),
    };
  });
}

globalThis.getWeeklyCalendar = getWeeklyCalendar;


const internationalOccasions = [
  { month: 1, day: 1, title: 'New Year’s Day' },
  { month: 1, day: 4, title: 'World Braille Day' },
  { month: 1, day: 24, title: 'International Day of Education' },
  { month: 1, day: 27, title: 'International Holocaust Remembrance Day' },
  { month: 2, day: 4, title: 'World Cancer Day' },
  { month: 2, day: 11, title: 'International Day of Women and Girls in Science' },
  { month: 2, day: 13, title: 'World Radio Day' },
  { month: 2, day: 14, title: 'Valentine’s Day' },
  { month: 2, day: 20, title: 'World Day of Social Justice' },
  { month: 2, day: 21, title: 'International Mother Language Day' },
  { month: 3, day: 1, title: 'Zero Discrimination Day' },
  { month: 3, day: 3, title: 'World Wildlife Day' },
  { month: 3, day: 8, title: 'International Women’s Day' },
  { month: 3, day: 20, title: 'International Day of Happiness' },
  { month: 3, day: 21, title: 'International Day of Nowruz' },
  { month: 3, day: 21, title: 'World Poetry Day' },
  { month: 3, day: 22, title: 'World Water Day' },
  { month: 3, day: 23, title: 'World Meteorological Day' },
  { month: 3, day: 24, title: 'World Tuberculosis Day' },
  { month: 4, day: 2, title: 'World Autism Awareness Day' },
  { month: 4, day: 7, title: 'World Health Day' },
  { month: 4, day: 12, title: 'International Day of Human Space Flight' },
  { month: 4, day: 18, title: 'International Day for Monuments and Sites' },
  { month: 4, day: 22, title: 'Earth Day' },
  { month: 4, day: 23, title: 'World Book and Copyright Day' },
  { month: 4, day: 25, title: 'World Malaria Day' },
  { month: 4, day: 26, title: 'World Intellectual Property Day' },
  { month: 4, day: 28, title: 'World Day for Safety and Health at Work' },
  { month: 4, day: 30, title: 'International Jazz Day' },
  { month: 5, day: 1, title: 'International Workers’ Day' },
  { month: 5, day: 3, title: 'World Press Freedom Day' },
  { month: 5, day: 8, title: 'World Red Cross and Red Crescent Day' },
  { month: 5, day: 15, title: 'International Day of Families' },
  { month: 5, day: 17, title: 'World Telecommunication and Information Society Day' },
  { month: 5, day: 21, title: 'World Day for Cultural Diversity' },
  { month: 5, day: 22, title: 'International Day for Biological Diversity' },
  { month: 5, day: 29, title: 'International Day of UN Peacekeepers' },
  { month: 5, day: 31, title: 'World No Tobacco Day' },
  { month: 6, day: 1, title: 'Global Day of Parents' },
  { month: 6, day: 3, title: 'World Bicycle Day' },
  { month: 6, day: 5, title: 'World Environment Day' },
  { month: 6, day: 8, title: 'World Oceans Day' },
  { month: 6, day: 12, title: 'World Day Against Child Labour' },
  { month: 6, day: 14, title: 'World Blood Donor Day' },
  { month: 6, day: 20, title: 'World Refugee Day' },
  { month: 6, day: 21, title: 'International Yoga Day' },
  { month: 6, day: 23, title: 'United Nations Public Service Day' },
  { month: 6, day: 26, title: 'International Day against Drug Abuse' },
  { month: 7, day: 11, title: 'World Population Day' },
  { month: 7, day: 18, title: 'Nelson Mandela International Day' },
  { month: 7, day: 30, title: 'International Day of Friendship' },
  { month: 7, day: 30, title: 'World Day Against Trafficking in Persons' },
  { month: 8, day: 9, title: 'International Day of the World’s Indigenous Peoples' },
  { month: 8, day: 12, title: 'International Youth Day' },
  { month: 8, day: 19, title: 'World Humanitarian Day' },
  { month: 8, day: 23, title: 'International Day for the Remembrance of the Slave Trade' },
  { month: 8, day: 29, title: 'International Day against Nuclear Tests' },
  { month: 8, day: 30, title: 'International Day of the Victims of Enforced Disappearances' },
  { month: 9, day: 5, title: 'International Day of Charity' },
  { month: 9, day: 8, title: 'International Literacy Day' },
  { month: 9, day: 15, title: 'International Day of Democracy' },
  { month: 9, day: 16, title: 'International Day for the Preservation of the Ozone Layer' },
  { month: 9, day: 21, title: 'International Day of Peace' },
  { month: 9, day: 27, title: 'World Tourism Day' },
  { month: 9, day: 28, title: 'International Day for Universal Access to Information' },
  { month: 9, day: 30, title: 'International Translation Day' },
  { month: 10, day: 1, title: 'International Day of Older Persons' },
  { month: 10, day: 2, title: 'International Day of Non-Violence' },
  { month: 10, day: 5, title: 'World Teachers’ Day' },
  { month: 10, day: 9, title: 'World Post Day' },
  { month: 10, day: 10, title: 'World Mental Health Day' },
  { month: 10, day: 11, title: 'International Day of the Girl Child' },
  { month: 10, day: 13, title: 'International Day for Disaster Risk Reduction' },
  { month: 10, day: 15, title: 'International Day of Rural Women' },
  { month: 10, day: 16, title: 'World Food Day' },
  { month: 10, day: 17, title: 'International Day for the Eradication of Poverty' },
  { month: 10, day: 24, title: 'United Nations Day' },
  { month: 10, day: 24, title: 'World Development Information Day' },
  { month: 10, day: 31, title: 'World Cities Day' },
  { month: 11, day: 2, title: 'International Day to End Impunity for Crimes against Journalists' },
  { month: 11, day: 10, title: 'World Science Day for Peace and Development' },
  { month: 11, day: 16, title: 'International Day for Tolerance' },
  { month: 11, day: 19, title: 'World Toilet Day' },
  { month: 11, day: 20, title: 'World Children’s Day' },
  { month: 11, day: 21, title: 'World Television Day' },
  { month: 11, day: 25, title: 'International Day for the Elimination of Violence against Women' },
  { month: 11, day: 29, title: 'International Day of Solidarity with the Palestinian People' },
  { month: 12, day: 1, title: 'World AIDS Day' },
  { month: 12, day: 2, title: 'International Day for the Abolition of Slavery' },
  { month: 12, day: 3, title: 'International Day of Persons with Disabilities' },
  { month: 12, day: 5, title: 'International Volunteer Day' },
  { month: 12, day: 7, title: 'International Civil Aviation Day' },
  { month: 12, day: 9, title: 'International Anti-Corruption Day' },
  { month: 12, day: 10, title: 'Human Rights Day' },
  { month: 12, day: 18, title: 'International Migrants Day' },
  { month: 12, day: 20, title: 'International Human Solidarity Day' },
  { month: 12, day: 25, title: 'Christmas Day' },
  { month: 12, day: 27, title: 'International Day of Epidemic Preparedness' },
];

const iranOccasions = [
  { month: 1, day: 1, title: 'Nowruz' },
  { month: 1, day: 2, title: 'Nowruz holiday' },
  { month: 1, day: 3, title: 'Nowruz holiday' },
  { month: 1, day: 4, title: 'Nowruz holiday' },
  { month: 1, day: 6, title: 'Zoroaster’s birthday' },
  { month: 1, day: 7, title: 'World Theatre Day in Iran' },
  { month: 1, day: 12, title: 'Islamic Republic Day' },
  { month: 1, day: 13, title: 'Nature Day' },
  { month: 1, day: 20, title: 'National Nuclear Technology Day' },
  { month: 1, day: 21, title: 'Anniversary of the establishment of the Foundation of Housing' },
  { month: 1, day: 25, title: 'Attar of Nishapur Day' },
  { month: 1, day: 29, title: 'Army Day in Iran' },
  { month: 1, day: 30, title: 'Laboratory Sciences Day in Iran' },
  { month: 2, day: 1, title: 'Saadi Day' },
  { month: 2, day: 2, title: 'Establishment of the Islamic Revolutionary Guard Corps' },
  { month: 2, day: 3, title: 'Sheikh Bahai Day / Architect’s Day' },
  { month: 2, day: 9, title: 'Councils Day in Iran' },
  { month: 2, day: 10, title: 'National Persian Gulf Day' },
  { month: 2, day: 11, title: 'International Workers’ Day in Iran' },
  { month: 2, day: 12, title: 'Teacher’s Day in Iran' },
  { month: 2, day: 15, title: 'Shiraz Day' },
  { month: 2, day: 18, title: 'Rare Diseases Day in Iran' },
  { month: 2, day: 19, title: 'Documents and National Heritage Day' },
  { month: 2, day: 25, title: 'Ferdowsi Day / Persian Language Day' },
  { month: 2, day: 27, title: 'Communications and Public Relations Day' },
  { month: 2, day: 28, title: 'Omar Khayyam Day' },
  { month: 3, day: 1, title: 'Mulla Sadra Day' },
  { month: 3, day: 3, title: 'Liberation of Khorramshahr' },
  { month: 3, day: 14, title: 'Anniversary of Imam Khomeini’s passing' },
  { month: 3, day: 15, title: '15 Khordad uprising' },
  { month: 3, day: 20, title: 'World Handicrafts Day in Iran' },
  { month: 3, day: 27, title: 'Agricultural Jihad Day' },
  { month: 3, day: 29, title: 'Ali Shariati Day' },
  { month: 4, day: 1, title: 'Guilds Day in Iran' },
  { month: 4, day: 7, title: 'Judiciary Week' },
  { month: 4, day: 8, title: 'Day of Combating Chemical and Biological Weapons' },
  { month: 4, day: 10, title: 'Industry and Mine Day' },
  { month: 4, day: 13, title: 'Tirgan Festival' },
  { month: 4, day: 14, title: 'Pen Day in Iran' },
  { month: 4, day: 25, title: 'Welfare and Social Security Day' },
  { month: 4, day: 26, title: 'Guardian Council Day' },
  { month: 4, day: 27, title: 'Tax Day in Iran' },
  { month: 5, day: 8, title: 'Sohrevardi Day' },
  { month: 5, day: 9, title: 'Blood Donation Day in Iran' },
  { month: 5, day: 14, title: 'Constitutional Revolution Day' },
  { month: 5, day: 17, title: 'Journalist Day in Iran' },
  { month: 5, day: 21, title: 'Small Industries Support Day' },
  { month: 5, day: 23, title: 'Resistance Economy Day' },
  { month: 5, day: 28, title: '1953 Iranian coup anniversary' },
  { month: 5, day: 30, title: 'World Mosque Day in Iran' },
  { month: 6, day: 1, title: 'Avicenna Day / Doctors’ Day' },
  { month: 6, day: 2, title: 'Start of Government Week' },
  { month: 6, day: 4, title: 'Government Employee Day' },
  { month: 6, day: 5, title: 'Razi Day / Pharmacists’ Day' },
  { month: 6, day: 8, title: 'National Day Against Terrorism' },
  { month: 6, day: 13, title: 'Abu Rayhan Biruni Day' },
  { month: 6, day: 21, title: 'Cinema Day in Iran' },
  { month: 6, day: 27, title: 'Persian Poetry and Literature Day' },
  { month: 6, day: 31, title: 'Sacred Defense Week begins' },
  { month: 7, day: 1, title: 'Mehr 1 / Beginning of the school year' },
  { month: 7, day: 5, title: 'World Tourism Day in Iran' },
  { month: 7, day: 7, title: 'Firefighters’ Day in Iran' },
  { month: 7, day: 8, title: 'Rumi Day' },
  { month: 7, day: 9, title: 'Solidarity with Palestinian Children Day' },
  { month: 7, day: 13, title: 'Police Day in Iran' },
  { month: 7, day: 14, title: 'Tehran Day' },
  { month: 7, day: 20, title: 'Hafez Day' },
  { month: 7, day: 24, title: 'National Paralympic Day' },
  { month: 7, day: 29, title: 'Export Day in Iran' },
  { month: 8, day: 1, title: 'Statistics and Planning Day' },
  { month: 8, day: 8, title: 'Teenager Day in Iran' },
  { month: 8, day: 13, title: 'Student Day in Iran' },
  { month: 8, day: 14, title: 'Culture Day in Iran' },
  { month: 8, day: 24, title: 'Book and Reading Week begins' },
  { month: 8, day: 25, title: 'Isfahan Day' },
  { month: 9, day: 5, title: 'Basij Week' },
  { month: 9, day: 7, title: 'Navy Day in Iran' },
  { month: 9, day: 10, title: 'Martyr Modarres Day / Parliament Day' },
  { month: 9, day: 12, title: 'Constitution Day in Iran' },
  { month: 9, day: 16, title: 'Student Day' },
  { month: 9, day: 25, title: 'Research Day in Iran' },
  { month: 9, day: 26, title: 'Transportation Day in Iran' },
  { month: 9, day: 30, title: 'Yalda Night' },
  { month: 10, day: 1, title: 'Beginning of winter' },
  { month: 10, day: 5, title: 'Safety against Earthquakes Day' },
  { month: 10, day: 7, title: 'Literacy Movement Day' },
  { month: 10, day: 9, title: 'National Day of Insight' },
  { month: 10, day: 13, title: 'Martyr Soleimani Day' },
  { month: 10, day: 19, title: 'Qom uprising anniversary' },
  { month: 10, day: 20, title: 'Amir Kabir martyrdom anniversary' },
  { month: 11, day: 1, title: 'Sadeh Festival' },
  { month: 11, day: 12, title: 'Return of Imam Khomeini to Iran' },
  { month: 11, day: 19, title: 'Air Force Day in Iran' },
  { month: 11, day: 22, title: 'Islamic Revolution Victory Day' },
  { month: 11, day: 29, title: 'Resistance Economy Day' },
  { month: 12, day: 5, title: 'Engineer’s Day in Iran' },
  { month: 12, day: 14, title: 'Charity Day in Iran' },
  { month: 12, day: 15, title: 'Tree Planting Day' },
  { month: 12, day: 22, title: 'Martyrs’ Day in Iran' },
  { month: 12, day: 25, title: 'Parvin Etesami Day' },
  { month: 12, day: 29, title: 'Oil Nationalization Day' },
];

const iranIslamicOccasions = [
  { month: 1, day: 9, title: 'Tasua' },
  { month: 1, day: 10, title: 'Ashura' },
  { month: 2, day: 20, title: 'Arbaeen' },
  { month: 2, day: 28, title: 'Prophet Muhammad passing / Imam Hasan martyrdom' },
  { month: 2, day: 30, title: 'Imam Reza martyrdom' },
  { month: 3, day: 17, title: 'Prophet Muhammad and Imam Sadiq birthday' },
  { month: 6, day: 3, title: 'Fatimah al-Zahra martyrdom' },
  { month: 7, day: 13, title: 'Imam Ali birthday' },
  { month: 7, day: 27, title: 'Mab’ath' },
  { month: 8, day: 15, title: 'Imam Mahdi birthday' },
  { month: 9, day: 19, title: 'Night of Qadr' },
  { month: 9, day: 21, title: 'Imam Ali martyrdom / Night of Qadr' },
  { month: 9, day: 23, title: 'Night of Qadr' },
  { month: 10, day: 1, title: 'Eid al-Fitr' },
  { month: 10, day: 2, title: 'Eid al-Fitr holiday' },
  { month: 11, day: 25, title: 'Imam Sadiq martyrdom' },
  { month: 12, day: 10, title: 'Eid al-Adha' },
  { month: 12, day: 18, title: 'Eid al-Ghadir' },
];

function getPersianDatePartsFromUtc(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-nu-latn', {
    timeZone: 'UTC',
    calendar: 'persian',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal' && part.type !== 'era').map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getIslamicDatePartsFromUtc(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-nu-latn', {
    timeZone: 'UTC',
    calendar: 'islamic-umalqura',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal' && part.type !== 'era').map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function addPersianMonths({ year, month }, monthOffset) {
  const zeroBasedMonth = month - 1 + monthOffset;
  const normalizedYear = year + Math.floor(zeroBasedMonth / 12);
  const normalizedMonth = ((zeroBasedMonth % 12) + 12) % 12;

  return { year: normalizedYear, month: normalizedMonth + 1 };
}

function getPersianDayOfYear(month, day) {
  return month <= 6 ? (month - 1) * 31 + day : 186 + (month - 7) * 30 + day;
}

function findGregorianDateForPersianDate(year, month, day) {
  const estimate = new Date(Date.UTC(year + 621, 2, 20 + getPersianDayOfYear(month, day) - 1, 12));

  for (let offset = -40; offset <= 40; offset += 1) {
    const candidate = addUtcDays(estimate, offset);
    const parts = getPersianDatePartsFromUtc(candidate);

    if (parts.year === year && parts.month === month && parts.day === day) {
      return candidate;
    }
  }

  throw new Error(`Unable to map Persian date ${year}/${month}/${day}`);
}

function formatNumber(value) {
  return String(value).padStart(2, '0');
}

function formatNumericCalendarTitle(date, calendarId) {
  const { year, month } = getCalendarPartsFromUtc(date, calendarId);
  return `${year} / ${formatNumber(month)}`;
}

function formatSelectedCalendarDate(date, calendarId) {
  const { year, month, day } = getCalendarPartsFromUtc(date, calendarId);
  const weekday = new Intl.DateTimeFormat('en-US-u-nu-latn', {
    timeZone: 'UTC',
    calendar: calendarId === 'gregorian' ? 'gregory' : 'persian',
    weekday: 'long',
  }).format(date);

  return `${weekday} ${year}/${formatNumber(month)}/${formatNumber(day)}`;
}

function buildYearOptions(selectedYear) {
  return Array.from({ length: 21 }, (_, index) => selectedYear - 10 + index);
}

function getGregorianMonthOffset(cityDate, year, month) {
  return (year - cityDate.getUTCFullYear()) * 12 + month - 1 - cityDate.getUTCMonth();
}

function getPersianMonthOffset(cityDate, year, month) {
  const cityPersianParts = getPersianDatePartsFromUtc(cityDate);
  return (year - cityPersianParts.year) * 12 + month - cityPersianParts.month;
}

function getGregorianMonthCalendar(cityDate, monthOffset, selectedDateKey) {
  const monthDate = addUtcMonths(cityDate, monthOffset);
  const monthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1, 12));
  const gridStart = getMonthGridStart(monthStart, 1);

  return {
    id: 'gregorian',
    eyebrow: 'Gregorian monthly calendar',
    title: formatNumericCalendarTitle(monthStart, 'gregorian'),
    weekdays: gregorianWeekdays,
    monthValue: monthStart.getUTCMonth() + 1,
    monthOptions: getCalendarMonthOptions('gregorian'),
    yearValue: monthStart.getUTCFullYear(),
    yearOptions: buildYearOptions(monthStart.getUTCFullYear()),
    selectedLabel: formatSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, 'gregorian'),
    days: Array.from({ length: 42 }, (_, index) => {
      const dayDate = addUtcDays(gridStart, index);
      const dateKey = getCalendarDateKey(dayDate);

      return {
        id: `gregorian-${dateKey}`,
        date: dayDate,
        dateKey,
        number: dayDate.getUTCDate(),
        isOutsideMonth: dayDate.getUTCMonth() !== monthStart.getUTCMonth(),
        isToday: isSameUtcDay(dayDate, cityDate),
        isSelected: selectedDateKey === dateKey,
      };
    }),
  };
}

function getPersianMonthCalendar(cityDate, monthOffset, selectedDateKey) {
  const currentPersianParts = getPersianDatePartsFromUtc(cityDate);
  const targetMonth = addPersianMonths(currentPersianParts, monthOffset);
  const monthStart = findGregorianDateForPersianDate(targetMonth.year, targetMonth.month, 1);
  const gridStart = getMonthGridStart(monthStart, 6);

  return {
    id: 'persian',
    eyebrow: 'Solar Hijri monthly calendar',
    title: formatNumericCalendarTitle(monthStart, 'persian'),
    weekdays: persianWeekdays,
    monthValue: targetMonth.month,
    monthOptions: getCalendarMonthOptions('persian'),
    yearValue: targetMonth.year,
    yearOptions: buildYearOptions(targetMonth.year),
    selectedLabel: formatSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, 'persian'),
    days: Array.from({ length: 42 }, (_, index) => {
      const dayDate = addUtcDays(gridStart, index);
      const persianParts = getPersianDatePartsFromUtc(dayDate);
      const dateKey = getCalendarDateKey(dayDate);

      return {
        id: `persian-${dateKey}`,
        date: dayDate,
        dateKey,
        number: persianParts.day,
        isOutsideMonth: persianParts.year !== targetMonth.year || persianParts.month !== targetMonth.month,
        isToday: isSameUtcDay(dayDate, cityDate),
        isSelected: selectedDateKey === dateKey,
      };
    }),
  };
}



function getCalendarMonthOffset(calendarId, cityDate, date) {
  if (calendarId === 'gregorian') {
    return (date.getUTCFullYear() - cityDate.getUTCFullYear()) * 12 + date.getUTCMonth() - cityDate.getUTCMonth();
  }

  const cityPersianParts = getPersianDatePartsFromUtc(cityDate);
  const datePersianParts = getPersianDatePartsFromUtc(date);
  return (datePersianParts.year - cityPersianParts.year) * 12 + datePersianParts.month - cityPersianParts.month;
}

function getCalendarPartsFromUtc(date, calendarId) {
  if (calendarId === 'gregorian') {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  return getPersianDatePartsFromUtc(date);
}

function getCalendarMonthStart(cityDate, calendarId, monthOffset) {
  if (calendarId === 'gregorian') {
    const monthDate = addUtcMonths(cityDate, monthOffset);
    return new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1, 12));
  }

  const cityPersianParts = getPersianDatePartsFromUtc(cityDate);
  const targetMonth = addPersianMonths(cityPersianParts, monthOffset);
  return findGregorianDateForPersianDate(targetMonth.year, targetMonth.month, 1);
}

function getCalendarMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;

    return { label: formatNumber(value), value };
  });
}

function formatCalendarMonthTitle(date, calendarId) {
  return formatNumericCalendarTitle(date, calendarId);
}

function formatCompactCalendarDate(date, calendarId) {
  const { day, month } = getCalendarPartsFromUtc(date, calendarId);

  return { day, month: formatNumber(month) };
}

function getDateOccasions(date) {
  const gregorianParts = getCalendarPartsFromUtc(date, 'gregorian');
  const persianParts = getCalendarPartsFromUtc(date, 'persian');
  const islamicParts = getIslamicDatePartsFromUtc(date);
  const internationalEvents = internationalOccasions
    .filter((event) => event.month === gregorianParts.month && event.day === gregorianParts.day)
    .map((event) => ({ ...event, calendar: 'International', dateLabel: `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}` }));
  const iranEvents = iranOccasions
    .filter((event) => event.month === persianParts.month && event.day === persianParts.day)
    .map((event) => ({ ...event, calendar: 'Iran', dateLabel: `${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}` }));
  const islamicEvents = iranIslamicOccasions
    .filter((event) => event.month === islamicParts.month && event.day === islamicParts.day)
    .map((event) => ({ ...event, calendar: 'Iran Islamic', dateLabel: `${islamicParts.day}/${islamicParts.month} AH` }));

  return [...iranEvents, ...islamicEvents, ...internationalEvents];
}

function getMonthOccasionGroups(days, primaryCalendar) {
  return days
    .filter((day) => !day.isOutsideMonth && day.events.length > 0)
    .map((day) => ({
      id: `occasion-${day.dateKey}`,
      dateKey: day.dateKey,
      primaryDate: day.primaryDate,
      secondaryDate: day.secondaryDate,
      title: `${day.primaryDate.month}/${formatNumber(day.primaryDate.day)}`,
      events: day.events,
    }));
}

function getSyncedMonthCalendar(cityDate, primaryCalendar, monthOffset, selectedDateKey) {
  const secondaryCalendar = primaryCalendar === 'gregorian' ? 'persian' : 'gregorian';
  const monthStart = getCalendarMonthStart(cityDate, primaryCalendar, monthOffset);
  const primaryParts = getCalendarPartsFromUtc(monthStart, primaryCalendar);
  const firstDayOfWeek = primaryCalendar === 'persian' ? 6 : 1;
  const gridStart = getMonthGridStart(monthStart, firstDayOfWeek);

  const days = Array.from({ length: 42 }, (_, index) => {
    const dayDate = addUtcDays(gridStart, index);
    const dateKey = getCalendarDateKey(dayDate);
    const dayPrimaryParts = getCalendarPartsFromUtc(dayDate, primaryCalendar);
    const primaryDate = formatCompactCalendarDate(dayDate, primaryCalendar);

    return {
      id: `synced-${primaryCalendar}-${dateKey}`,
      dateKey,
      primaryDate,
      secondaryDate: formatCompactCalendarDate(dayDate, secondaryCalendar),
      events: getDateOccasions(dayDate),
      isOutsideMonth: dayPrimaryParts.year !== primaryParts.year || dayPrimaryParts.month !== primaryParts.month,
      isToday: isSameUtcDay(dayDate, cityDate),
      isSelected: selectedDateKey === dateKey,
    };
  });

  return {
    id: primaryCalendar,
    secondaryId: secondaryCalendar,
    eyebrow: 'Synced monthly calendar',
    title: formatCalendarMonthTitle(monthStart, primaryCalendar),
    secondaryTitle: formatCalendarMonthTitle(monthStart, secondaryCalendar),
    weekdays: primaryCalendar === 'persian' ? persianWeekdays : gregorianWeekdays,
    monthValue: primaryParts.month,
    monthOptions: getCalendarMonthOptions(primaryCalendar),
    yearValue: primaryParts.year,
    yearOptions: buildYearOptions(primaryParts.year),
    selectedLabel: formatSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, primaryCalendar),
    days,
    occasions: getMonthOccasionGroups(days, primaryCalendar),
  };
}

function formatDate(date, timeZone, locale = 'en-US', calendar = 'gregory', withWeekday = true) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    calendar,
    ...(withWeekday ? { weekday: 'long' } : {}),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatMonthDay(date, timeZone, locale = 'en-US', calendar = 'gregory') {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    calendar,
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatWeekday(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  }).format(date);
}

function getTimeOfDay(numericHour) {
  if (numericHour >= 4 && numericHour < 7) {
    return { id: 'dawn', label: 'Early morning' };
  }

  if (numericHour >= 7 && numericHour < 12) {
    return { id: 'morning', label: 'Morning' };
  }

  if (numericHour >= 12 && numericHour < 15) {
    return { id: 'noon', label: 'Noon' };
  }

  if (numericHour >= 15 && numericHour < 18) {
    return { id: 'afternoon', label: 'Afternoon' };
  }

  if (numericHour >= 18 && numericHour < 21) {
    return { id: 'evening', label: 'Evening' };
  }

  return { id: 'night', label: 'Night' };
}

function getCitySnapshot(now, city) {
  const cityDate = getCityDate(now, city.timeZone);
  const gregorianParts = getZonedDateParts(now, city.timeZone);
  const persianParts = getPersianDateParts(now, city.timeZone);
  const gregorianDate = formatMonthDay(now, city.timeZone);
  const persianDate = formatMonthDay(now, city.timeZone, 'en-US-u-nu-latn', 'persian');
  const { hour } = getTimeParts(now, city.timeZone);
  const timeOfDay = getTimeOfDay(Number(hour));

  return {
    ...city,
    time: formatTime(now, city.timeZone),
    shortTime: formatTime(now, city.timeZone, false),
    shortDate: new Intl.DateTimeFormat('en-US', {
      timeZone: city.timeZone,
      day: 'numeric',
      month: 'short',
    }).format(now),
    gregorianDate,
    persianDate,
    gregorianYear: gregorianParts.year,
    persianYear: persianParts.year,
    weekday: formatWeekday(now, city.timeZone),
    cityDate,
    gregorianWeek: getWeekNumber(cityDate),
    gregorianWeekDays: getWeeklyCalendar(now, city.timeZone, 'gregorian'),
    jalaliWeek: getPersianWeekNumber(now, city.timeZone),
    persianWeekDays: getWeeklyCalendar(now, city.timeZone, 'persian'),
    timeOfDay: timeOfDay.id,
    timeOfDayLabel: timeOfDay.label,
    dayNight: getDayNightData(now, city),
  };
}

function ToggleButton({ city, selected, canRemove, editMode, dragging, onDragEnd, onDragStart, onDrop, onRemove, onSelect }) {
  return h(
    'article',
    {
      className: `city-tab city-tab--${city.timeOfDay}${selected ? ' selected' : ''}${editMode ? ' editable' : ''}${dragging ? ' dragging' : ''}`,
      draggable: editMode,
      onDragEnd,
      onDragOver: (event) => {
        if (!editMode) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      },
      onDragStart: (event) => onDragStart(event, city.id),
      onDrop: (event) => onDrop(event, city.id),
      style: { '--accent': city.accent },
    },
    editMode && h('span', { className: 'drag-handle', 'aria-hidden': 'true' }, '⋮⋮'),
    h(
      'button',
      {
        type: 'button',
        className: 'city-tab__main',
        onClick: () => onSelect(city.id),
        'aria-pressed': selected,
      },
      h(
        'span',
        { className: 'city-tab__header' },
        h('span', { className: 'city-tab__name' }, city.label),
        h('span', { className: 'city-tab__date' }, city.shortDate),
      ),
      h('span', { className: 'city-tab__time' }, city.shortTime),
      h('span', { className: 'city-tab__phase' }, city.timeOfDayLabel),
    ),
    canRemove && h(
      'button',
      { type: 'button', className: 'remove-chip', onClick: () => onRemove(city.id), 'aria-label': `Remove ${city.label}` },
      '×',
    ),
  );
}

function SearchPanel({ query, results, onAdd, onQueryChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasQuery = query.trim().length > 0;
  const showResults = isOpen || hasQuery;
  const updateQuery = (event) => onQueryChange(event.target.value);

  return h(
    'div',
    { className: 'search-panel' },
    h(
      'label',
      { className: 'search-box' },
      h('span', null, 'Search and add a city'),
      h('input', {
        type: 'search',
        value: query,
        onInput: updateQuery,
        onChange: updateQuery,
        onFocus: () => setIsOpen(true),
        onBlur: () => setTimeout(() => setIsOpen(false), 120),
        placeholder: 'Try New York, Berlin, Istanbul, Sydney...',
        autoComplete: 'off',
        'aria-expanded': String(showResults),
      }),
    ),
    showResults && h(
      'div',
      { className: 'search-results', 'aria-live': 'polite' },
      results.length > 0
        ? results.map((city) => h(
          'button',
          {
            type: 'button',
            className: 'search-result',
            onMouseDown: (event) => event.preventDefault(),
            onClick: () => onAdd(city.id),
            key: city.id,
            style: { '--accent': city.accent },
          },
          h('span', null, city.label),
          h('small', null, `${city.country} · ${city.timeZone}`),
          h('strong', null, '+ Add'),
        ))
        : h('p', { className: 'search-empty' }, 'No city found, try another city or timezone name.'),
    ),
  );
}


function SettingsPanel({ ntpHostInput, ntpStatus, onHostInputChange, onSave, onSync }) {
  return h(
    'form',
    { className: 'settings-panel', onSubmit: onSave },
    h(
      'label',
      { className: 'settings-field' },
      h('span', null, 'NTP server'),
      h('input', {
        type: 'text',
        value: ntpHostInput,
        onInput: (event) => onHostInputChange(event.target.value),
        onChange: (event) => onHostInputChange(event.target.value),
        placeholder: 'ntp.time.ir',
        autoComplete: 'off',
      }),
    ),
    h(
      'div',
      { className: `ntp-status ntp-status--${ntpStatus.kind}` },
      h('strong', null, ntpStatus.label),
      h('span', null, ntpStatus.detail),
    ),
    h(
      'div',
      { className: 'settings-actions' },
      h('button', { type: 'submit', className: 'edit-toggle' }, 'Save NTP'),
      h('button', { type: 'button', className: 'secondary-button', onClick: onSync }, 'Sync now'),
    ),
  );
}



function DayNightCard({ city }) {
  const timeline = city.dayNight;

  return h(
    'section',
    { className: `day-night-card${timeline.isDaylight ? ' day-night-card--day' : ' day-night-card--night'}`, 'aria-label': `Day and night in ${city.label}` },
    h(
      'div',
      { className: 'day-night-card__header' },
      h('span', { className: 'day-night-card__icon', 'aria-hidden': 'true' }, timeline.isDaylight ? '☀️' : timeline.isTwilight ? '🌅' : '🌙'),
      h('div', null, h('span', null, timeline.eventLabel), h('strong', null, timeline.eventTime)),
      h('p', null, `${timeline.status}: ${timeline.remaining}${timeline.isEstimated ? ' · estimated' : ''}`),
    ),
    h(
      'div',
      { className: 'sun-chart' },
      h(
        'svg',
        { viewBox: '0 0 1000 300', role: 'img', 'aria-label': 'Twenty-four hour day and night curve' },
        h('defs', null,
          h('linearGradient', { id: 'daySkyGradient', x1: '0', x2: '0', y1: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#79b8f3', stopOpacity: '0.92' }),
            h('stop', { offset: '100%', stopColor: '#0f4f86', stopOpacity: '0.92' }),
          ),
          h('filter', { id: 'sunGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' },
            h('feGaussianBlur', { stdDeviation: '12', result: 'blur' }),
            h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })),
          ),
        ),
        h('rect', { x: '0', y: '0', width: '1000', height: '160', rx: '18', fill: 'url(#daySkyGradient)' }),
        h('rect', { x: '0', y: '160', width: '1000', height: '140', fill: '#15161a' }),
        [250, 500, 750].map((x) => h('line', { key: `v-${x}`, x1: x, x2: x, y1: '0', y2: '286', className: 'sun-chart__grid sun-chart__grid--dash' })),
        [75, 145, 215, 285].map((y) => h('line', { key: `h-${y}`, x1: '0', x2: '1000', y1: y, y2: y, className: 'sun-chart__grid' })),
        h('line', { x1: '0', x2: '1000', y1: '160', y2: '160', className: 'sun-chart__horizon' }),
        h('polyline', { points: timeline.sunPath, className: 'sun-chart__path' }),
        h('circle', { cx: timeline.currentX, cy: timeline.currentY, r: '22', className: 'sun-chart__sun', filter: timeline.isDaylight ? 'url(#sunGlow)' : undefined }),
        ['00', '06', '12', '18'].map((label, index) => h('text', { key: label, x: 12 + index * 250, y: '276', className: 'sun-chart__label' }, label)),
      ),
    ),
    h(
      'div',
      { className: 'day-night-card__details' },
      [
        ['First Light', timeline.firstLight],
        ['Sunrise', timeline.sunrise],
        ['Sunset', timeline.sunset],
        ['Last Light', timeline.lastLight],
        ['Total Daylight', timeline.totalDaylight],
      ].map(([label, value]) => h('div', { className: 'day-night-card__row', key: label }, h('strong', null, label), h('span', null, value))),
    ),
  );
}


function MonthlyCalendarCard({ city }) {
  const todayKey = getCalendarDateKey(city.cityDate);
  const [primaryCalendar, setPrimaryCalendar] = useState('persian');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  let calendar = null;

  try {
    calendar = getSyncedMonthCalendar(city.cityDate, primaryCalendar, monthOffset, selectedDateKey);
  } catch (error) {
    return h(
      'section',
      { className: 'monthly-calendars monthly-calendars--error', 'aria-label': 'Calendar loading issue' },
      h(
        'article',
        { className: 'monthly-calendar monthly-calendar--error' },
        h('strong', null, 'Calendar is temporarily unavailable'),
        h('p', null, error?.message || 'The clock is still available while the calendar recovers.'),
      ),
    );
  }

  const moveMonth = (direction) => {
    setMonthOffset((offset) => offset + direction);
  };
  const resetMonth = () => {
    setMonthOffset(0);
    setSelectedDateKey(todayKey);
  };
  const selectDay = (dateKey) => {
    const selectedDate = new Date(`${dateKey}T12:00:00Z`);

    setSelectedDateKey(dateKey);
    setMonthOffset(getCalendarMonthOffset(primaryCalendar, city.cityDate, selectedDate));
  };
  const selectMonth = (month) => {
    const nextOffset = primaryCalendar === 'gregorian'
      ? getGregorianMonthOffset(city.cityDate, calendar.yearValue, month)
      : getPersianMonthOffset(city.cityDate, calendar.yearValue, month);

    setMonthOffset(nextOffset);
  };
  const selectYear = (year) => {
    const nextOffset = primaryCalendar === 'gregorian'
      ? getGregorianMonthOffset(city.cityDate, year, calendar.monthValue)
      : getPersianMonthOffset(city.cityDate, year, calendar.monthValue);

    setMonthOffset(nextOffset);
  };
  const switchPrimaryCalendar = (nextPrimaryCalendar) => {
    const selectedDate = new Date(`${selectedDateKey || todayKey}T12:00:00Z`);

    setPrimaryCalendar(nextPrimaryCalendar);
    setMonthOffset(getCalendarMonthOffset(nextPrimaryCalendar, city.cityDate, selectedDate));
  };

  return h(
    'section',
    { className: 'monthly-calendars monthly-calendars--synced', 'aria-label': `Synced Gregorian and Solar Hijri calendar for ${city.label}` },
    h(
      'article',
      { className: `monthly-calendar monthly-calendar--synced monthly-calendar--primary-${calendar.id}` },
      h(
        'header',
        { className: 'monthly-calendar__header' },
        h('span', null, calendar.eyebrow),
        h('strong', null, calendar.title),
        h(
          'div',
          { className: 'monthly-calendar__actions', 'aria-label': `${calendar.title} navigation` },
          h('button', { type: 'button', onClick: () => moveMonth(-1), 'aria-label': 'Previous month' }, '‹'),
          h('button', { type: 'button', onClick: resetMonth }, 'Today'),
          h('button', { type: 'button', onClick: () => moveMonth(1), 'aria-label': 'Next month' }, '›'),
        ),
        h('small', null, `Inside: ${calendar.secondaryTitle} · Selected: ${calendar.selectedLabel}`),
        h(
          'div',
          { className: 'monthly-calendar__mode', 'aria-label': 'Choose primary calendar' },
          [
            { id: 'persian', label: 'Solar Hijri primary' },
            { id: 'gregorian', label: 'Gregorian primary' },
          ].map((option) => h(
            'button',
            {
              type: 'button',
              className: option.id === primaryCalendar ? 'selected' : '',
              onClick: () => switchPrimaryCalendar(option.id),
              'aria-pressed': option.id === primaryCalendar,
              key: option.id,
            },
            option.label,
          )),
        ),
        h(
          'div',
          { className: 'monthly-calendar__filters', 'aria-label': `${calendar.title} quick filters` },
          h(
            'label',
            { className: 'monthly-calendar__filter' },
            h('span', null, 'Month'),
            h(
              'select',
              {
                value: calendar.monthValue,
                onChange: (event) => selectMonth(Number(event.target.value)),
              },
              calendar.monthOptions.map((option) => h('option', { value: option.value, key: option.value }, option.label)),
            ),
          ),
          h(
            'label',
            { className: 'monthly-calendar__filter' },
            h('span', null, 'Year'),
            h(
              'select',
              {
                value: calendar.yearValue,
                onChange: (event) => selectYear(Number(event.target.value)),
              },
              calendar.yearOptions.map((year) => h('option', { value: year, key: year }, year)),
            ),
          ),
        ),
      ),
      h(
        'div',
        { className: 'monthly-calendar__weekdays', 'aria-hidden': 'true' },
        calendar.weekdays.map((weekday) => h('span', { key: weekday }, weekday)),
      ),
      h(
        'div',
        { className: 'monthly-calendar__days monthly-calendar__days--overlay' },
        calendar.days.map((day) => h(
          'button',
          {
            type: 'button',
            className: `monthly-calendar__day monthly-calendar__day--overlay${day.events.length ? ' monthly-calendar__day--has-events' : ''}${day.isOutsideMonth ? ' monthly-calendar__day--outside' : ''}${day.isToday ? ' monthly-calendar__day--today' : ''}${day.isSelected ? ' monthly-calendar__day--selected' : ''}`,
            onClick: () => selectDay(day.dateKey),
            'aria-pressed': day.isSelected,
            key: day.id,
          },
          h(
            'strong',
            null,
            day.primaryDate.day,
          ),
          h(
            'small',
            null,
            `${day.secondaryDate.month}/${formatNumber(day.secondaryDate.day)}`,
          ),
        )),
      ),
    ),
    h(
      'aside',
      { className: 'monthly-occasions', 'aria-label': `${calendar.title} occasions` },
      h(
        'header',
        null,
        h('span', null, 'Month occasions'),
        h('strong', null, calendar.title),
        h('small', null, `Iran + International + Islamic occasions · ${calendar.occasions.length} days`),
      ),
      calendar.occasions.length > 0
        ? h(
          'div',
          { className: 'monthly-occasions__list' },
          calendar.occasions.map((group) => h(
            'article',
            { className: 'monthly-occasions__day', key: group.id },
            h(
              'div',
              { className: 'monthly-occasions__date' },
              h('strong', null, group.primaryDate.day),
              h('small', null, `${group.secondaryDate.month}/${formatNumber(group.secondaryDate.day)}`),
            ),
            h(
              'ul',
              null,
              group.events.map((event) => h(
                'li',
                { key: `${group.id}-${event.calendar}-${event.title}` },
                h('span', null, event.calendar),
                h('strong', null, event.title),
              )),
            ),
          )),
        )
        : h('p', { className: 'monthly-occasions__empty' }, 'No fixed Iran or international occasion is listed for this month.'),
    ),
  );
}

function SplitPill({ label, items, wide = false }) {
  return h(
    'article',
    { className: `info-pill split-pill${wide ? ' split-pill--wide' : ''}` },
    h('span', null, label),
    h(
      'div',
      { className: 'split-pill__grid' },
      items.map((item) => h(
        'div',
        { className: 'split-pill__item', key: item.label },
        h('small', null, item.label),
        h('strong', null, item.value),
      )),
    ),
  );
}

function InfoPill({ label, value }) {
  return h(
    'article',
    { className: 'info-pill' },
    h('span', null, label),
    h('strong', null, value),
  );
}

function App() {
  const [now, setNow] = useState(() => new Date());
  const [timeOffset, setTimeOffset] = useState(0);
  const [activeCityIds, setActiveCityIds] = useState(getInitialCityIds);
  const [selectedCityId, setSelectedCityId] = useState(activeCityIds[0] || defaultCityIds[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ntpHost, setNtpHost] = useState(getInitialNtpHost);
  const [ntpHostInput, setNtpHostInput] = useState(ntpHost);
  const [ntpStatus, setNtpStatus] = useState({ kind: 'local', label: 'Local clock', detail: 'Using this device until NTP sync succeeds.' });
  const [ntpSyncRequest, setNtpSyncRequest] = useState(0);
  const [draggingCityId, setDraggingCityId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const updateClock = () => setNow(new Date(Date.now() + timeOffset));
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [timeOffset]);

  useEffect(() => {
    localStorage.setItem(savedCitiesKey, JSON.stringify(activeCityIds));
  }, [activeCityIds]);

  useEffect(() => {
    localStorage.setItem(savedNtpHostKey, ntpHost);
  }, [ntpHost]);

  useEffect(() => {
    if (!activeCityIds.includes(selectedCityId)) {
      setSelectedCityId(activeCityIds[0] || defaultCityIds[0]);
    }
  }, [activeCityIds, selectedCityId]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);


  useEffect(() => {
    let ignore = false;

    const syncNtp = async () => {
      if (!navigator.onLine) {
        setTimeOffset(0);
        setNtpStatus({ kind: 'offline', label: 'Offline', detail: 'No internet detected; using this device clock.' });
        return;
      }

      setNtpStatus({ kind: 'syncing', label: 'Syncing NTP', detail: `Reading ${ntpHost}...` });
      const startedAt = Date.now();

      try {
        const response = await fetch(`/api/ntp?host=${encodeURIComponent(ntpHost)}`);
        const data = await response.json();
        const endedAt = Date.now();

        if (!response.ok) {
          throw new Error(data.error || 'NTP sync failed.');
        }

        if (ignore) {
          return;
        }

        const midpoint = startedAt + (endedAt - startedAt) / 2;
        setTimeOffset(data.time - midpoint);
        setNtpStatus({
          kind: 'ntp',
          label: 'Synced with NTP',
          detail: `${data.host} · ${Math.round(endedAt - startedAt)}ms round trip`,
        });
      } catch (error) {
        if (ignore) {
          return;
        }

        setTimeOffset(0);
        setNtpStatus({
          kind: 'error',
          label: 'NTP unavailable',
          detail: `${error.message || 'Could not sync.'} Using this device clock.`,
        });
      }
    };

    syncNtp();
    const syncTimer = setInterval(syncNtp, 300000);
    window.addEventListener('online', syncNtp);
    window.addEventListener('offline', syncNtp);

    return () => {
      ignore = true;
      clearInterval(syncTimer);
      window.removeEventListener('online', syncNtp);
      window.removeEventListener('offline', syncNtp);
    };
  }, [ntpHost, ntpSyncRequest]);

  const activeCities = useMemo(
    () => activeCityIds.map((id) => allCities.find((city) => city.id === id)).filter(Boolean),
    [activeCityIds],
  );
  const activeSnapshots = useMemo(() => activeCities.map((city) => getCitySnapshot(now, city)), [activeCities, now]);
  const selectedCity = activeSnapshots.find((city) => city.id === selectedCityId) || activeSnapshots[0];

  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    document.title = `${selectedCity.label} · ${selectedCity.time}`;
  }, [selectedCity]);

  const activeIdSet = useMemo(() => new Set(activeCityIds), [activeCityIds]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allCities
      .filter((city) => !activeIdSet.has(city.id))
      .filter((city) => !query || `${city.label} ${city.country} ${city.timeZone}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [activeIdSet, searchQuery]);

  const addCity = (cityId) => {
    setActiveCityIds((currentIds) => (currentIds.includes(cityId) ? currentIds : [...currentIds, cityId]));
    setSelectedCityId(cityId);
    setSearchQuery('');
  };

  const toggleEditMode = () => {
    setEditMode((currentMode) => !currentMode);
    setSearchQuery('');
  };

  const removeCity = (cityId) => {
    setActiveCityIds((currentIds) => {
      if (currentIds.length === 1) {
        return currentIds;
      }

      const nextIds = currentIds.filter((id) => id !== cityId);

      if (cityId === selectedCityId) {
        setSelectedCityId(nextIds[0]);
      }

      return nextIds;
    });
  };

  const moveCity = (draggedCityId, targetCityId) => {
    if (!draggedCityId || draggedCityId === targetCityId) {
      return;
    }

    setActiveCityIds((currentIds) => {
      const draggedIndex = currentIds.indexOf(draggedCityId);
      const targetIndex = currentIds.indexOf(targetCityId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return currentIds;
      }

      const nextIds = [...currentIds];
      const [draggedId] = nextIds.splice(draggedIndex, 1);
      nextIds.splice(targetIndex, 0, draggedId);
      return nextIds;
    });
  };

  const handleDragStart = (event, cityId) => {
    if (!editMode) {
      return;
    }

    setDraggingCityId(cityId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cityId);
  };

  const handleDrop = (event, targetCityId) => {
    if (!editMode) {
      return;
    }

    event.preventDefault();
    moveCity(event.dataTransfer.getData('text/plain') || draggingCityId, targetCityId);
    setDraggingCityId(null);
  };


  const saveNtpHost = (event) => {
    event.preventDefault();
    const nextHost = ntpHostInput.trim();

    if (!nextHost) {
      setNtpStatus({ kind: 'error', label: 'NTP host required', detail: 'Enter a hostname like ntp.time.ir.' });
      return;
    }

    setNtpHost(nextHost);
    setNtpSyncRequest((requestId) => requestId + 1);
  };

  const syncCurrentNtpHost = () => {
    const nextHost = ntpHostInput.trim();

    if (nextHost && nextHost !== ntpHost) {
      setNtpHost(nextHost);
      return;
    }

    setNtpSyncRequest((requestId) => requestId + 1);
  };

  const fullscreenSupported = Boolean(document.documentElement.requestFullscreen && document.exitFullscreen);
  const fullscreenLabel = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';

  const toggleFullscreen = () => {
    if (!fullscreenSupported) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    document.documentElement.requestFullscreen();
  };

  return h(
    'main',
    { className: 'page-shell', 'aria-label': `Current time in ${selectedCity.label}` },
    h(
      'section',
      { className: 'hero-panel', style: { '--accent': selectedCity.accent } },
      h(
        'div',
        { className: 'top-bar' },
        h('p', { className: 'eyebrow' }, 'Time in ', h('strong', null, selectedCity.label), `, ${selectedCity.country} now`),
        h(
          'button',
          {
            type: 'button',
            className: 'fullscreen-button',
            onClick: toggleFullscreen,
            disabled: !fullscreenSupported,
            'aria-pressed': isFullscreen,
            title: fullscreenSupported ? fullscreenLabel : 'Fullscreen is not supported on this device',
            'aria-label': fullscreenSupported ? fullscreenLabel : 'Fullscreen is not supported on this device',
          },
          h('span', { className: 'fullscreen-button__icon', 'aria-hidden': 'true' }, isFullscreen ? '↙' : '↗'),
          h('span', { className: 'fullscreen-button__copy' }, fullscreenLabel),
          h('span', { className: 'fullscreen-button__hint', 'aria-hidden': 'true' }, isFullscreen ? 'Esc' : 'View'),
        ),
      ),
      h(
        'div',
        { className: 'hero-content' },
        h('h1', { className: 'clock', 'aria-live': 'polite' }, selectedCity.time),
        h(
          'div',
          { className: 'hero-meta', 'aria-label': 'Calendar details' },
          h(InfoPill, { label: 'Weekday', value: selectedCity.weekday }),
          h(SplitPill, {
            label: 'Years',
            items: [
              { label: 'Gregorian', value: selectedCity.gregorianYear },
              { label: 'Solar Hijri', value: selectedCity.persianYear },
            ],
          }),
          h(SplitPill, {
            label: 'Dates',
            wide: true,
            items: [
              { label: 'Gregorian', value: selectedCity.gregorianDate },
              { label: 'Solar Hijri', value: selectedCity.persianDate },
            ],
          }),
          h(SplitPill, {
            label: 'Week of year',
            wide: true,
            items: [
              { label: 'Gregorian', value: `Week ${selectedCity.gregorianWeek}` },
              { label: 'Solar Hijri', value: `Week ${selectedCity.jalaliWeek}` },
            ],
          }),
        ),
      ),
    ),
    h(DayNightCard, { city: selectedCity }),
    h(MonthlyCalendarCard, { city: selectedCity }),
    h(
      'section',
      { className: 'switcher-panel', 'aria-label': 'Switch city time' },
      h(
        'div',
        { className: 'section-heading' },
        h('span', null, 'Manage timezones'),
        h(
          'div',
          { className: 'heading-actions' },
          h('strong', null, editMode ? 'Search, add, remove, and drag cities' : 'Switch between your saved cities'),
          h('button', { type: 'button', className: 'secondary-button', onClick: () => setSettingsOpen((isOpen) => !isOpen) }, settingsOpen ? 'Close settings' : 'Settings'),
          h('button', { type: 'button', className: 'edit-toggle', onClick: toggleEditMode }, editMode ? 'Done' : 'Edit'),
        ),
      ),
      settingsOpen && h(SettingsPanel, {
        ntpHostInput,
        ntpStatus,
        onHostInputChange: setNtpHostInput,
        onSave: saveNtpHost,
        onSync: syncCurrentNtpHost,
      }),
      editMode && h(SearchPanel, { query: searchQuery, results: searchResults, onAdd: addCity, onQueryChange: setSearchQuery }),
      h(
        'div',
        { className: `city-tabs${editMode ? ' city-tabs--editing' : ''}` },
        activeSnapshots.map((city) => h(ToggleButton, {
          city,
          selected: city.id === selectedCity.id,
          canRemove: editMode && activeSnapshots.length > 1,
          editMode,
          dragging: draggingCityId === city.id,
          onDragEnd: () => setDraggingCityId(null),
          onDragStart: handleDragStart,
          onDrop: handleDrop,
          onRemove: removeCity,
          onSelect: setSelectedCityId,
          key: city.id,
        })),
      ),
    ),
  );
}


function renderFallbackError(error) {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    return;
  }

  rootElement.innerHTML = `
    <main class="page-shell page-shell--error">
      <section class="app-error-panel">
        <p>Time app could not start.</p>
        <strong>${error?.message || 'Unknown error'}</strong>
        <small>Please refresh the page or clear the browser cache.</small>
      </section>
    </main>
  `;
}

try {
  createRoot(document.getElementById('root')).render(h(App));
} catch (error) {
  renderFallbackError(error);
}
