import React, { useEffect, useMemo, useState } from 'react';
import internationalOccasions from './data/occasions-gregorian.json' with { type: 'json' };
import iranOccasions from './data/occasions-persian.json' with { type: 'json' };
import iranIslamicOccasions from './data/occasions-islamic.json' with { type: 'json' };
import islamicYearStartSync from './data/islamic-year-start-sync.json' with { type: 'json' };
import i18n from './data/i18n.json' with { type: 'json' };
import cityTranslationsFa from './data/city-translations-fa.json' with { type: 'json' };
import { createRoot } from 'react-dom/client';

const { createElement: h } = React;

const accentPalette = ['#f97316', '#7c3aed', '#2563eb', '#db2777', '#059669', '#0891b2', '#ea580c', '#4f46e5'];

const defaultCities = [
  { id: 'tehran', label: 'Tehran', localFaLabel: 'تهران', country: 'Iran', localFaCountry: 'ایران', timeZone: 'Asia/Tehran', latitude: 35.6892, longitude: 51.3890, accent: accentPalette[0] },
  { id: 'los-angeles', label: 'Los Angeles', localFaLabel: 'لس‌آنجلس', country: 'United States', localFaCountry: 'ایالات متحده', timeZone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437, accent: accentPalette[1] },
  { id: 'london', label: 'London', localFaLabel: 'لندن', country: 'United Kingdom', localFaCountry: 'بریتانیا', timeZone: 'Europe/London', latitude: 51.5072, longitude: -0.1276, accent: accentPalette[2] },
  { id: 'paris', label: 'Paris', localFaLabel: 'پاریس', country: 'France', localFaCountry: 'فرانسه', timeZone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522, accent: accentPalette[3] },
  { id: 'tokyo', label: 'Tokyo', localFaLabel: 'توکیو', country: 'Japan', localFaCountry: 'ژاپن', timeZone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503, accent: accentPalette[4] },
  { id: 'dubai', label: 'Dubai', localFaLabel: 'دبی', country: 'United Arab Emirates', localFaCountry: 'امارات', timeZone: 'Asia/Dubai', latitude: 25.2048, longitude: 55.2708, accent: accentPalette[5] },
];

const savedCitiesKey = 'time-app-cities';
const savedNtpHostKey = 'time-app-ntp-host';
const savedLanguageKey = 'time-app-language';
const defaultNtpHost = 'ntp.time.ir';
const ntpServerOptions = [
  { host: 'ntp.time.ir', label: 'Iran NTP (ntp.time.ir)' },
  { host: 'pool.ntp.org', label: 'NTP Pool Project' },
  { host: 'time.google.com', label: 'Google Public NTP' },
  { host: 'time.cloudflare.com', label: 'Cloudflare Time Services' },
  { host: 'time.aws.com', label: 'Amazon Time Sync' },
  { host: 'time.apple.com', label: 'Apple NTP' },
  { host: 'time.windows.com', label: 'Microsoft Windows Time' },
];

function getInitialLanguage() {
  const saved = localStorage.getItem(savedLanguageKey);
  return saved === 'fa' ? 'fa' : 'en';
}

function toTitleCase(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toPersianLikeLabel(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/St/g, 'Saint')
    .replace(/Mt/g, 'Mount');
}

function makeCityFromTimeZone(timeZone, index) {
  const pieces = timeZone.split('/');
  const rawLabel = pieces[pieces.length - 1] || timeZone;
  const region = pieces.length > 1 ? toTitleCase(pieces[0]) : 'World';

  const label = toTitleCase(rawLabel);
  return {
    id: timeZone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    label,
    localFaLabel: cityTranslationsFa[timeZone]?.fa_city || label,
    country: region,
    localFaCountry: cityTranslationsFa[timeZone]?.fa_country || region,
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

const faTimeOfDay = { dawn: 'صبح خیلی زود', morning: 'صبح', noon: 'ظهر', afternoon: 'بعدازظهر', evening: 'عصر', night: 'شب' };
function getLocalizedWeekdays(calendar, language) { if (language !== 'fa') return calendar === 'persian' ? persianWeekdays : gregorianWeekdays; return calendar === 'persian' ? ['ش','ی','د','س','چ','پ','ج'] : ['د','س','چ','پ','ج','ش','ی']; }


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

function formatDuration(totalMinutes, language = 'en') {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return language === 'fa' ? `${minutes} دقیقه` : `${minutes}min`;
  }

  if (minutes === 0) {
    return language === 'fa' ? `${hours} ساعت` : `${hours}hr`;
  }

  return language === 'fa' ? `${hours} ساعت ${minutes} دقیقه` : `${hours}hr ${minutes}min`;
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

function getDayNightData(date, city, language = 'en') {
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
    remaining: formatDuration(remainingMinutes, language),
    status,
    sunPath: buildSolarPath({ sunrise, sunset, horizonY, peakY, nightY }),
    sunrise: formatMinutesAsTime(sunrise),
    sunset: formatMinutesAsTime(sunset),
    totalDaylight: formatDuration(daylightDuration, language),
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

function getIslamicRawDatePartsFromUtc(date) {
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

function resolveIslamicYearOffsetDays(anchor) {
  const expectedDate = new Date(`${anchor.gregorianDate}T12:00:00Z`);

  for (let offset = -3; offset <= 3; offset += 1) {
    const candidate = addUtcDays(expectedDate, offset);
    const parts = getIslamicRawDatePartsFromUtc(candidate);

    if (parts.year === anchor.islamicYear && parts.month === 1 && parts.day === 1) {
      return Math.round((expectedDate.getTime() - candidate.getTime()) / dayInMilliseconds);
    }
  }

  return 0;
}

const islamicYearOffsetDays = new Map(islamicYearStartSync.map((anchor) => [anchor.islamicYear, resolveIslamicYearOffsetDays(anchor)]));

function getIslamicDatePartsFromUtc(date) {
  const rawParts = getIslamicRawDatePartsFromUtc(date);
  const offsetDays = islamicYearOffsetDays.get(rawParts.year) || 0;

  if (!offsetDays) {
    return rawParts;
  }

  return getIslamicRawDatePartsFromUtc(addUtcDays(date, -offsetDays));
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

function getShiftedCalendarMonthOffset(calendarId, cityDate, monthOffset, direction) {
  if (calendarId === 'gregorian') {
    const currentMonth = addUtcMonths(cityDate, monthOffset);
    const shiftedMonth = addUtcMonths(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1, 12)), direction);
    return getGregorianMonthOffset(cityDate, shiftedMonth.getUTCFullYear(), shiftedMonth.getUTCMonth() + 1);
  }

  const cityPersianParts = getPersianDatePartsFromUtc(cityDate);
  const currentMonth = addPersianMonths(cityPersianParts, monthOffset);
  const shiftedMonth = addPersianMonths(currentMonth, direction);
  return getPersianMonthOffset(cityDate, shiftedMonth.year, shiftedMonth.month);
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

function getLocalizedOccasionTitle(event, language) {
  if (language === 'fa') {
    return event.title_fa || event.fa || event.title;
  }
  return event.title_en || event.en || event.title;
}

function getDateOccasions(date, language, t) {
  const gregorianParts = getCalendarPartsFromUtc(date, 'gregorian');
  const persianParts = getCalendarPartsFromUtc(date, 'persian');
  const islamicParts = getIslamicDatePartsFromUtc(date);
  const internationalEvents = internationalOccasions
    .filter((event) => event.month === gregorianParts.month && event.day === gregorianParts.day)
    .map((event) => ({ ...event, title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_international, dateLabel: `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}` }));
  const iranEvents = iranOccasions
    .filter((event) => event.month === persianParts.month && event.day === persianParts.day)
    .map((event) => ({ ...event, title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_iran, dateLabel: `${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}` }));
  const islamicEvents = iranIslamicOccasions
    .filter((event) => event.month === islamicParts.month && event.day === islamicParts.day)
    .map((event) => ({ ...event, title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_islamic, dateLabel: `${islamicParts.day}/${islamicParts.month} AH` }));

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

function getSyncedMonthCalendar(cityDate, primaryCalendar, monthOffset, selectedDateKey, t, language) {
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
      events: getDateOccasions(dayDate, language, t),
      isOutsideMonth: dayPrimaryParts.year !== primaryParts.year || dayPrimaryParts.month !== primaryParts.month,
      isToday: isSameUtcDay(dayDate, cityDate),
      isSelected: selectedDateKey === dateKey,
    };
  });

  return {
    id: primaryCalendar,
    secondaryId: secondaryCalendar,
    eyebrow: t.synced_monthly_calendar,
    title: formatCalendarMonthTitle(monthStart, primaryCalendar),
    secondaryTitle: formatCalendarMonthTitle(monthStart, secondaryCalendar),
    weekdays: getLocalizedWeekdays(primaryCalendar === 'persian' ? 'persian' : 'gregorian', language),
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

function getCitySnapshot(now, city, language) {
  const cityDate = getCityDate(now, city.timeZone);
  const gregorianParts = getZonedDateParts(now, city.timeZone);
  const persianParts = getPersianDateParts(now, city.timeZone);
  const gregorianDate = formatMonthDay(now, city.timeZone, language === 'fa' ? 'fa-IR' : 'en-US');
  const persianDate = formatMonthDay(now, city.timeZone, language === 'fa' ? 'fa-IR' : 'en-US-u-nu-latn', 'persian');
  const { hour } = getTimeParts(now, city.timeZone);
  const timeOfDay = getTimeOfDay(Number(hour));

  const cityLabel = language === 'fa' ? (city.localFaLabel || city.label) : city.label;
  const countryLabel = language === 'fa' ? (city.localFaCountry || city.country) : city.country;

  return {
    ...city,
    label: cityLabel,
    country: countryLabel,
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
    weekday: new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US', { timeZone: city.timeZone, weekday: 'long' }).format(now),
    cityDate,
    gregorianWeek: getWeekNumber(cityDate),
    gregorianWeekDays: getWeeklyCalendar(now, city.timeZone, 'gregorian'),
    jalaliWeek: getPersianWeekNumber(now, city.timeZone),
    persianWeekDays: getWeeklyCalendar(now, city.timeZone, 'persian'),
    timeOfDay: timeOfDay.id,
    timeOfDayLabel: language === 'fa' ? (faTimeOfDay[timeOfDay.id] || timeOfDay.label) : timeOfDay.label,
    dayNight: getDayNightData(now, city, language),
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

function SearchPanel({ query, results, onAdd, onQueryChange, t, language }) {
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
      h('span', null, t.search_add_city),
      h('input', {
        type: 'search',
        value: query,
        onInput: updateQuery,
        onChange: updateQuery,
        onFocus: () => setIsOpen(true),
        onBlur: () => setTimeout(() => setIsOpen(false), 120),
        placeholder: t.search_placeholder,
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
          h('span', null, language === 'fa' ? (city.localFaLabel || city.label) : city.label),
          h('small', null, `${language === 'fa' ? (city.localFaCountry || city.country) : city.country} · ${city.timeZone}`),
          h('strong', null, t.add),
        ))
        : h('p', { className: 'search-empty' }, t.no_city_found),
    ),
  );
}


function SettingsPanel({ ntpHostInput, ntpStatus, ntpServerPresets, onHostInputChange, onPresetSelect, onSave, onSync, t }) {
  const selectedPreset = ntpServerPresets.find((server) => server.host === ntpHostInput.trim())?.host || 'custom';
  const delayLabel = typeof ntpStatus.delayMs === 'number' ? `${ntpStatus.delayMs}ms` : ntpStatus.delay || 'Not measured';

  return h(
    'form',
    { className: 'settings-panel ntp-settings-panel', onSubmit: onSave },
    h(
      'div',
      { className: 'settings-panel__header' },
      h('span', null, t.ntp_settings),
      h('strong', null, t.trusted_time_source),
      h('small', null, t.ntp_help),
    ),
    h(
      'label',
      { className: 'settings-field' },
      h('span', null, t.trusted_servers),
      h(
        'select',
        {
          value: selectedPreset,
          onChange: (event) => onPresetSelect(event.target.value),
        },
        ntpServerPresets.map((server) => h('option', { value: server.host, key: server.host }, server.label)),
        h('option', { value: 'custom' }, t.custom_ntp),
      ),
    ),
    h(
      'label',
      { className: 'settings-field' },
      h('span', null, t.custom_hostname),
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
      h(
        'dl',
        { className: 'ntp-status__metrics' },
        h('div', null, h('dt', null, t.server), h('dd', null, ntpStatus.host || ntpHostInput || defaultNtpHost)),
        h('div', null, h('dt', null, t.delay), h('dd', null, delayLabel)),
      ),
    ),
    h(
      'div',
      { className: 'settings-actions' },
      h('button', { type: 'submit', className: 'edit-toggle' }, t.save_ntp),
      h('button', { type: 'button', className: 'secondary-button', onClick: onSync }, t.sync_now),
    ),
  );
}


function TimezoneManager({ cities, selectedCityId, editMode, searchQuery, searchResults, draggingCityId, onAdd, onDragEnd, onDragStart, onDrop, onEditToggle, onQueryChange, onRemove, onSelect, t, language }) {
  return h(
    'section',
    { className: 'timezone-manager', 'aria-label': t.manage_timezones },
    h(
      'div',
      { className: 'section-heading timezone-manager__heading' },
      h('span', null, t.manage_timezones),
      h(
        'div',
        { className: 'heading-actions' },
        h('button', { type: 'button', className: 'edit-toggle', onClick: onEditToggle }, editMode ? t.done : t.edit),
      ),
    ),
    h(SearchPanel, { query: searchQuery, results: searchResults, onAdd, onQueryChange, t, language }),
    h(
      'div',
      { className: `timezone-list${editMode ? ' timezone-list--editing' : ''}` },
      cities.map((city) => h(
        'article',
        {
          className: `timezone-row${city.id === selectedCityId ? ' selected' : ''}${editMode ? ' editable' : ''}${draggingCityId === city.id ? ' dragging' : ''}`,
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
          key: city.id,
        },
        editMode && h('span', { className: 'drag-handle', 'aria-hidden': 'true' }, '⋮⋮'),
        h(
          'button',
          {
            type: 'button',
            className: 'timezone-row__main',
            onClick: () => onSelect(city.id),
            'aria-pressed': city.id === selectedCityId,
          },
          language === 'fa'
            ? [h('span', { className: 'timezone-row__phase', key: 'phase' }, city.timeOfDayLabel), h('span', { className: 'timezone-row__name', key: 'name' }, city.label)]
            : [h('span', { className: 'timezone-row__name', key: 'name' }, city.label), h('span', { className: 'timezone-row__phase', key: 'phase' }, city.timeOfDayLabel)],
        ),
        editMode && cities.length > 1 && h(
          'button',
          { type: 'button', className: 'remove-chip', onClick: () => onRemove(city.id), 'aria-label': `${t.remove} ${city.label}` },
          '×',
        ),
      )),
    ),
  );
}

function DayNightCard({ city, t }) {
  const timeline = city.dayNight;
  const localizedStatus = timeline.status === 'Twilight'
    ? t.twilight
    : timeline.status === 'Night remaining'
      ? t.night_remaining
      : timeline.status === 'Daylight remaining'
        ? t.daylight_remaining
        : timeline.status;
  const localizedEventLabel = timeline.eventLabel === 'Sunrise' ? t.sunrise : timeline.eventLabel === 'Sunset' ? t.sunset : timeline.eventLabel;

  return h(
    'section',
    { className: `day-night-card${timeline.isDaylight ? ' day-night-card--day' : ' day-night-card--night'}`, 'aria-label': `Day and night in ${city.label}` },
    h(
      'div',
      { className: 'day-night-card__header' },
      h('span', { className: 'day-night-card__icon', 'aria-hidden': 'true' }, timeline.isDaylight ? '☀️' : timeline.isTwilight ? '🌅' : '🌙'),
      h('div', null, h('span', null, localizedEventLabel), h('strong', null, timeline.eventTime)),
      h('p', null, `${localizedStatus}: ${timeline.remaining}${timeline.isEstimated ? ` · ${t.estimated}` : ''}`),
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
        [t.first_light, timeline.firstLight],
        [t.sunrise, timeline.sunrise],
        [t.sunset, timeline.sunset],
        [t.last_light, timeline.lastLight],
        [t.total_daylight, timeline.totalDaylight],
      ].map(([label, value]) => h('div', { className: 'day-night-card__row', key: label }, h('strong', null, label), h('span', null, value))),
    ),
  );
}


function MonthlyCalendarCard({ city, t, language }) {
  const todayKey = getCalendarDateKey(city.cityDate);
  const [primaryCalendar, setPrimaryCalendar] = useState('persian');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  let calendar = null;

  try {
    calendar = getSyncedMonthCalendar(city.cityDate, primaryCalendar, monthOffset, selectedDateKey, t, language);
  } catch (error) {
    return h(
      'section',
      { className: 'monthly-calendars monthly-calendars--error', 'aria-label': t.calendar_loading_issue },
      h(
        'article',
        { className: 'monthly-calendar monthly-calendar--error' },
        h('strong', null, t.calendar_unavailable),
        h('p', null, error?.message || t.calendar_recovery),
      ),
    );
  }

  const moveMonth = (direction) => {
    setMonthOffset((offset) => getShiftedCalendarMonthOffset(primaryCalendar, city.cityDate, offset, direction));
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
          { className: 'monthly-calendar__toolbar' },
          h(
            'div',
            { className: 'monthly-calendar__filters', 'aria-label': `${calendar.title} quick filters` },
            h(
              'label',
              { className: 'monthly-calendar__filter' },
              h('span', null, t.month),
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
              h('span', null, t.year),
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
          h(
            'div',
            { className: 'monthly-calendar__actions', 'aria-label': `${calendar.title} navigation` },
            h('button', { type: 'button', onClick: () => moveMonth(-1), 'aria-label': t.previous_month }, '‹'),
            h('button', { type: 'button', onClick: resetMonth }, t.today),
            h('button', { type: 'button', onClick: () => moveMonth(1), 'aria-label': t.next_month }, '›'),
          ),
        ),
        h('small', null, `${t.inside}: ${calendar.secondaryTitle} · ${t.selected}: ${calendar.selectedLabel}`),
        h(
          'div',
          { className: 'monthly-calendar__mode', 'aria-label': t.choose_primary_calendar },
          [
            { id: 'persian', label: 'Solar Hijri', shortLabel: 'Solar' },
            { id: 'gregorian', label: 'Gregorian', shortLabel: 'Gregorian' },
          ].map((option) => h(
            'button',
            {
              type: 'button',
              className: option.id === primaryCalendar ? 'selected' : '',
              onClick: () => switchPrimaryCalendar(option.id),
              'aria-pressed': option.id === primaryCalendar,
              'aria-label': `${option.label} primary`,
              key: option.id,
            },
            option.shortLabel,
          )),
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
        h('span', null, t.month_occasions),
        h('strong', null, calendar.title),
        h('small', null, `${t.occasions_summary} · ${calendar.occasions.length} ${t.days}`),
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
        : h('p', { className: 'monthly-occasions__empty' }, t.no_occasions),
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
  const [ntpHost, setNtpHost] = useState(getInitialNtpHost);
  const [ntpHostInput, setNtpHostInput] = useState(ntpHost);
  const [ntpStatus, setNtpStatus] = useState({ kind: 'local', label: i18n.en.local_clock, detail: i18n.en.using_device_clock, host: ntpHost, delay: i18n.en.not_measured });
  const [ntpSyncRequest, setNtpSyncRequest] = useState(0);
  const [draggingCityId, setDraggingCityId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [language, setLanguage] = useState(getInitialLanguage);
  const isFa = language === 'fa';

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
    localStorage.setItem(savedLanguageKey, language);
    document.documentElement.lang = language;
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
  }, [isFa, language]);

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
        setNtpStatus({ kind: 'offline', label: t.offline, detail: t.no_internet, host: ntpHost, delay: t.offline });
        return;
      }

      setNtpStatus({ kind: 'syncing', label: t.syncing_ntp, detail: `${t.reading} ${ntpHost}...`, host: ntpHost, delay: t.measuring });
      const startedAt = Date.now();

      try {
        const response = await fetch(`/api/ntp?host=${encodeURIComponent(ntpHost)}`);
        const data = await response.json();
        const endedAt = Date.now();

        if (!response.ok) {
          throw new Error(data.error || t.ntp_sync_failed);
        }

        if (ignore) {
          return;
        }

        const midpoint = startedAt + (endedAt - startedAt) / 2;
        setTimeOffset(data.time - midpoint);
        setNtpStatus({
          kind: 'ntp',
          label: t.synced_with_ntp,
          detail: `${data.host} ${t.connected_successfully}` ,
          host: data.host,
          delayMs: Math.round(endedAt - startedAt),
        });
      } catch (error) {
        if (ignore) {
          return;
        }

        setTimeOffset(0);
        setNtpStatus({
          kind: 'error',
          label: t.ntp_unavailable,
          detail: `${error.message || t.could_not_sync} ${t.using_device_clock_fallback}` ,
          host: ntpHost,
          delay: 'Failed',
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
  const activeSnapshots = useMemo(() => activeCities.map((city) => getCitySnapshot(now, city, language)), [activeCities, now, language]);
  const selectedCity = activeSnapshots.find((city) => city.id === selectedCityId) || activeSnapshots[0];

  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    document.title = `${selectedCity.label} · ${selectedCity.time}`;
  }, [selectedCity]);

  const numberLocale = isFa ? 'fa-IR-u-nu-arabext' : 'en-US';
  const formatLocaleNumber = (value) => new Intl.NumberFormat(numberLocale).format(value);
  const t = i18n[language] || i18n.en;
  const selectedCityView = selectedCity
    ? {
      ...selectedCity,
      time: new Intl.DateTimeFormat(numberLocale, {
        timeZone: selectedCity.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).format(now),
      gregorianYear: formatLocaleNumber(selectedCity.gregorianYear),
      persianYear: formatLocaleNumber(selectedCity.persianYear),
      gregorianWeek: formatLocaleNumber(selectedCity.gregorianWeek),
      jalaliWeek: formatLocaleNumber(selectedCity.jalaliWeek),
    }
    : selectedCity;

  const activeIdSet = useMemo(() => new Set(activeCityIds), [activeCityIds]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allCities
      .filter((city) => !activeIdSet.has(city.id))
      .filter((city) => {
        if (!query) {
          return true;
        }

        const searchableText = language === 'fa'
          ? `${city.localFaLabel || city.label} ${city.localFaCountry || city.country} ${city.label} ${city.country} ${city.timeZone}`
          : `${city.label} ${city.country} ${city.timeZone}`;

        return searchableText.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [activeIdSet, language, searchQuery]);

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
      setNtpStatus({ kind: 'error', label: t.ntp_host_required, detail: t.enter_hostname, host: ntpHost, delay: t.not_measured });
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


  const selectNtpPreset = (host) => {
    if (host === 'custom') {
      return;
    }

    setNtpHostInput(host);
    setNtpHost(host);
    setNtpSyncRequest((requestId) => requestId + 1);
  };

  const fullscreenSupported = Boolean(document.documentElement.requestFullscreen && document.exitFullscreen);
  const fullscreenLabel = isFullscreen ? t.exit_fullscreen : t.fullscreen;

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
    { className: `page-shell${isFa ? ' page-shell--rtl' : ''}`, 'aria-label': `${t.time_in} ${selectedCityView.label}` },
    h(
      'section',
      { className: 'hero-panel', style: { '--accent': selectedCityView.accent } },
      h(
        'div',
        { className: 'top-bar' },
        h('p', { className: 'eyebrow' }, language === 'fa' ? `${t.time_in} ${selectedCityView.country}، ` : `${t.time_in} `, h('strong', null, selectedCityView.label), language === 'fa' ? ` ${t.now_suffix}` : `, ${selectedCityView.country} ${t.now_suffix}`),
        h('div', { className: 'top-bar__controls' },
          h('div', { className: 'language-picker', role: 'group', 'aria-label': t.language },
            h('div', { className: 'language-picker__segmented' },
              h('button', { type: 'button', className: language === 'en' ? 'selected' : '', onClick: () => setLanguage('en'), 'aria-pressed': language === 'en' }, t.english),
              h('button', { type: 'button', className: language === 'fa' ? 'selected' : '', onClick: () => setLanguage('fa'), 'aria-pressed': language === 'fa' }, t.persian),
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'fullscreen-button',
              onClick: toggleFullscreen,
              disabled: !fullscreenSupported,
              'aria-pressed': isFullscreen,
              title: fullscreenSupported ? fullscreenLabel : t.fullscreen_unsupported,
              'aria-label': fullscreenSupported ? fullscreenLabel : t.fullscreen_unsupported,
            },
            h('span', { className: 'fullscreen-button__icon', 'aria-hidden': 'true' }, isFullscreen ? '↙' : '↗'),
            h('span', { className: 'fullscreen-button__copy' }, fullscreenLabel),
            h('span', { className: 'fullscreen-button__hint', 'aria-hidden': 'true' }, isFullscreen ? 'Esc' : 'View'),
          ),
        ),
      ),
      h(
        'div',
        { className: 'hero-content' },
        h('h1', { className: 'clock', 'aria-live': 'polite' }, selectedCityView.time),
        h(
          'div',
          { className: 'hero-meta', 'aria-label': t.calendar_details },
          h(InfoPill, { label: t.weekday, value: selectedCityView.weekday }),
          h(SplitPill, {
            label: t.years,
            items: [
              { label: t.gregorian, value: selectedCityView.gregorianYear },
              { label: t.solar_hijri, value: selectedCityView.persianYear },
            ],
          }),
          h(SplitPill, {
            label: t.dates,
            wide: true,
            items: [
              { label: t.gregorian, value: selectedCity.gregorianDate },
              { label: t.solar_hijri, value: selectedCity.persianDate },
            ],
          }),
          h(SplitPill, {
            label: t.week_of_year,
            wide: true,
            items: [
              { label: t.gregorian, value: `${t.week} ${selectedCityView.gregorianWeek}` },
              { label: t.solar_hijri, value: `${t.week} ${selectedCityView.jalaliWeek}` },
            ],
          }),
        ),
      ),
    ),
    h(
      'section',
      { className: 'solar-timezone-grid', 'aria-label': t.sun_status_timezone },
      h(DayNightCard, { city: selectedCityView, t }),
      h(TimezoneManager, {
        cities: activeSnapshots,
        selectedCityId: selectedCityView.id,
        editMode,
        searchQuery,
        searchResults,
        draggingCityId,
        onAdd: addCity,
        onDragEnd: () => setDraggingCityId(null),
        onDragStart: handleDragStart,
        onDrop: handleDrop,
        onEditToggle: toggleEditMode,
        onQueryChange: setSearchQuery,
        onRemove: removeCity,
        t,
        onSelect: setSelectedCityId,
        language,
      }),
    ),
    h(MonthlyCalendarCard, { city: selectedCityView, t, language }),
    h(
      'section',
      { className: 'switcher-panel ntp-panel', 'aria-label': t.ntp_settings },
      h(SettingsPanel, {
        ntpHostInput,
        ntpStatus,
        ntpServerPresets: ntpServerOptions,
        onHostInputChange: setNtpHostInput,
        onPresetSelect: selectNtpPreset,
        onSave: saveNtpHost,
        onSync: syncCurrentNtpHost,
        t,
      }),
    ),
  );
}


function renderFallbackError(error, t = i18n.en) {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    return;
  }

  rootElement.innerHTML = `
    <main class="page-shell page-shell--error">
      <section class="app-error-panel">
        <p>${t.app_start_failed}</p>
        <strong>${error?.message || 'Unknown error'}</strong>
        <small>${t.refresh_or_clear_cache}</small>
      </section>
    </main>
  `;
}

try {
  createRoot(document.getElementById('root')).render(h(App));
} catch (error) {
  renderFallbackError(error, i18n[(localStorage.getItem(savedLanguageKey) === 'fa' ? 'fa' : 'en')] || i18n.en);
}
