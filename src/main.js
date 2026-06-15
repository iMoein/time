import React, { useEffect, useMemo, useState } from 'react';
import internationalOccasions from './data/occasions-gregorian.json' with { type: 'json' };
import iranOccasions from './data/occasions-persian.json' with { type: 'json' };
import iranIslamicOccasions from './data/occasions-islamic.json' with { type: 'json' };
import islamicYearStartSync from './data/islamic-year-start-sync.json' with { type: 'json' };
import marketingOccasions from './data/calendar-files/international-marketing-occasions-simple-max.json' with { type: 'json' };
import globalOfficialGregorianOccasions from './data/calendar-files/global-official-gregorian-occasions-simple.json' with { type: 'json' };
import iranCurrentPersianOccasions from './data/calendar-files/iran-current-persian-occasions-simple.json' with { type: 'json' };
import iranAncientPahlaviOccasions from './data/calendar-files/iran-ancient-pahlavi-calendar-simple-supermax.json' with { type: 'json' };
import islamicShiaOccasions from './data/calendar-files/islamic-shia-occasions-simple-max.json' with { type: 'json' };
import islamicSunniOccasions from './data/calendar-files/islamic-sunni-occasions-simple-max.json' with { type: 'json' };
import islamicSharedOccasions from './data/calendar-files/islamic-shared-occasions-simple-max.json' with { type: 'json' };
import yearOptionsData from './data/year-options.json' with { type: 'json' };
import solarYearMomentsData from './data/solar-year-moments.json' with { type: 'json' };
import cardOrderConfig from './data/card-order.json' with { type: 'json' };
import officialHolidaysConfig from './data/official-holidays.json' with { type: 'json' };
import i18n from './data/i18n.json' with { type: 'json' };
import cityTranslationsFa from './data/city-translations-fa.json' with { type: 'json' };
import occasionDescriptions from './data/occasion-descriptions.json' with { type: 'json' };
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
const savedLanguageKey = 'time-app-language';
const savedSelectedCityKey = 'time-app-selected-city';
const savedSelectedCityCustomizedKey = 'time-app-selected-city-customized';
const savedOccasionFiltersKey = 'time-app-occasion-filters';
const savedDateBookmarksKey = 'time-app-date-bookmarks';
const userCitiesCustomizedKey = 'time-app-cities-customized';
const savedFullscreenBackgroundKey = 'time-app-fullscreen-background';
const defaultNtpHost = 'pool.ntp.org';
const bookmarkEffectIds = ['none', 'ribbons', 'balloons'];
const bookmarkEffectPaletteIds = ['white_pink', 'white_blue', 'white_red', 'white_black', 'black', 'multicolor'];
const defaultCardOrder = ['mainClock', 'sunAndTimezones', 'monthlyOccasions', 'solarYearMoment', 'dateTools'];
const weekdayIds = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getConfiguredCardOrder(config = {}) {
  const configuredOrder = Array.isArray(config.order) ? config.order : [];
  const validCards = new Set(defaultCardOrder);
  const orderedCards = [];

  configuredOrder.forEach((cardId) => {
    if (validCards.has(cardId) && !orderedCards.includes(cardId)) {
      orderedCards.push(cardId);
    }
  });

  defaultCardOrder.forEach((cardId) => {
    if (!orderedCards.includes(cardId)) {
      orderedCards.push(cardId);
    }
  });

  return orderedCards;
}

function normalizeBookmarkEffect(value) {
  if (value === 'color_ribbons' || value === 'black_ribbons') return 'ribbons';
  return bookmarkEffectIds.includes(value) ? value : 'none';
}

function normalizeBookmarkEffectPalette(value) {
  return bookmarkEffectPaletteIds.includes(value) ? value : 'multicolor';
}

function getBookmarkEffectType(bookmark = {}) {
  return normalizeBookmarkEffect(bookmark.effectType || bookmark.effect);
}

function getBookmarkEffectPalette(bookmark = {}) {
  if (bookmark.effectPalette) return normalizeBookmarkEffectPalette(bookmark.effectPalette);
  if (bookmark.effect === 'black_ribbons') return 'black';
  return 'multicolor';
}

function normalizeBookmarkTimePart(value, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, Math.trunc(number))) : 0;
}

function shouldDisplayHolidayRule(rule, displayCalendar) {
  const displayOn = Array.isArray(rule.displayOn)
    ? rule.displayOn
    : (rule.displayOn ? [rule.displayOn] : []);

  return displayOn.includes('both') || displayOn.includes(displayCalendar);
}

function getConfiguredHolidayRules(section, calendarId = null) {
  if (Array.isArray(section)) {
    return calendarId ? section.filter((rule) => !rule.calendar || rule.calendar === calendarId) : section;
  }

  if (calendarId && Array.isArray(section?.[calendarId])) {
    return section[calendarId].map((rule) => ({ ...rule, calendar: rule.calendar || calendarId, displayOn: rule.displayOn || [calendarId] }));
  }

  return [];
}

function getOfficialHolidayMatches(date, displayCalendar = 'persian') {
  const matches = [];
  const weekday = weekdayIds[date.getUTCDay()];
  const calendarParts = {
    gregorian: getCalendarPartsFromUtc(date, 'gregorian'),
    persian: getCalendarPartsFromUtc(date, 'persian'),
  };

  getConfiguredHolidayRules(officialHolidaysConfig.weekly).forEach((rule) => {
    if (shouldDisplayHolidayRule(rule, displayCalendar) && String(rule.weekday || '').toLowerCase() === weekday) {
      matches.push({ ...rule, status: rule.status || 'holiday', kind: 'weekly' });
    }
  });

  ['persian', 'gregorian'].forEach((calendarId) => {
    getConfiguredHolidayRules(officialHolidaysConfig.fixedDates, calendarId).forEach((rule) => {
      if (
        shouldDisplayHolidayRule(rule, displayCalendar)
        && Number(rule.month) === calendarParts[calendarId].month
        && Number(rule.day) === calendarParts[calendarId].day
      ) {
        matches.push({ ...rule, calendar: calendarId, status: rule.status || 'holiday', kind: 'fixedDate' });
      }
    });
  });

  return matches;
}

function getInitialLanguage() {
  const saved = localStorage.getItem(savedLanguageKey);
  return saved === 'fa' ? 'fa' : 'en';
}

function getInitialFullscreenBackground() {
  const saved = localStorage.getItem(savedFullscreenBackgroundKey);
  return saved === 'daynight' ? 'daynight' : 'dark';
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


function toCityAlias(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function resolveConfiguredCityId(rawId) {
  if (!rawId) return null;
  if (allCityIds.has(rawId)) return rawId;

  const alias = toCityAlias(rawId);
  if (!alias) return null;

  const byAlias = allCities.find((city) => {
    const labelAlias = toCityAlias(city.label);
    const faAlias = toCityAlias(city.localFaLabel || '');
    const tzAlias = toCityAlias(city.timeZone || '');
    return alias === labelAlias || alias === faAlias || alias === tzAlias;
  });

  return byAlias ? byAlias.id : null;
}

const faTimeOfDay = { dawn: 'صبح خیلی زود', morning: 'صبح', noon: 'ظهر', afternoon: 'بعدازظهر', evening: 'عصر', night: 'شب' };
function getLocalizedWeekdays(calendar, language) { if (language !== 'fa') return calendar === 'persian' ? persianWeekdays : gregorianWeekdays; return calendar === 'persian' ? ['ش','ی','د','س','چ','پ','ج'] : ['د','س','چ','پ','ج','ش','ی']; }


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

function getInitialDateBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(savedDateBookmarksKey) || '[]');
    if (!Array.isArray(saved)) return [];
    const fallbackCityId = localStorage.getItem(savedSelectedCityKey) || defaultCityIds[0];
    const fallbackTimeZone = allCities.find((city) => city.id === fallbackCityId)?.timeZone || defaultCities[0].timeZone;

    return saved
      .filter((bookmark) => bookmark && typeof bookmark === 'object')
      .map((bookmark) => ({
        id: String(bookmark.id || `date-${bookmark.dateKey || Date.now()}`),
        title: String(bookmark.title || '').trim(),
        description: String(bookmark.description || '').trim(),
        calendarType: bookmark.calendarType === 'gregorian' ? 'gregorian' : 'persian',
        year: Number(bookmark.year),
        month: Number(bookmark.month),
        day: Number(bookmark.day),
        dateKey: String(bookmark.dateKey || ''),
        hour: normalizeBookmarkTimePart(bookmark.hour, 23),
        minute: normalizeBookmarkTimePart(bookmark.minute, 59),
        second: normalizeBookmarkTimePart(bookmark.second, 59),
        timeZone: String(bookmark.timeZone || fallbackTimeZone),
        effect: getBookmarkEffectType(bookmark),
        effectType: getBookmarkEffectType(bookmark),
        effectPalette: getBookmarkEffectPalette(bookmark),
        showDescriptionInTimer: Boolean(bookmark.showDescriptionInTimer),
        createdAt: String(bookmark.createdAt || ''),
        updatedAt: String(bookmark.updatedAt || ''),
      }))
      .filter((bookmark) => Number.isFinite(bookmark.year) && Number.isFinite(bookmark.month) && Number.isFinite(bookmark.day) && bookmark.dateKey);
  } catch {
    return [];
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

function formatLocaleNumber(value, language = 'en') {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(locale).format(value);
}

function getDaysInGregorianMonth(year, month) {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
}

function getDaysInPersianMonth(year, month) {
  const start = findGregorianDateForPersianDate(year, month, 1);
  const nextMonth = addPersianMonths({ year, month }, 1);
  const nextStart = findGregorianDateForPersianDate(nextMonth.year, nextMonth.month, 1);
  return Math.round((nextStart.getTime() - start.getTime()) / 86400000);
}


const chineseZodiacAnimalsEn = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat / Sheep', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const chineseZodiacAnimalsFa = ['موش', 'گاو', 'ببر', 'خرگوش', 'اژدها', 'مار', 'اسب', 'بز / گوسفند', 'میمون', 'خروس', 'سگ', 'خوک'];
const iranianYearAnimalsEn = ['Rat', 'Ox', 'Tiger / Leopard', 'Rabbit', 'Dragon / Whale', 'Snake', 'Horse', 'Sheep', 'Monkey', 'Rooster / Hen', 'Dog', 'Pig'];
const iranianYearAnimalsFa = ['موش', 'گاو', 'پلنگ / ببر', 'خرگوش', 'نهنگ / اژدها', 'مار', 'اسب', 'گوسفند', 'میمون', 'مرغ / خروس', 'سگ', 'خوک'];
const solarMonthNamesEn = ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'];
const solarMonthNamesFa = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const gregorianMonthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const gregorianMonthNamesFa = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
const solarZodiacSignsEn = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const solarZodiacSignsFa = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];
const westernZodiacEquivalentsEn = ['Aries / Ram', 'Taurus / Bull', 'Gemini / Twins', 'Cancer / Crab', 'Leo / Lion', 'Virgo / Maiden', 'Libra / Scales', 'Scorpio / Scorpion', 'Sagittarius / Archer', 'Capricorn / Goat', 'Aquarius / Water Bearer', 'Pisces / Fish'];
const westernZodiacEquivalentsFa = ['Aries / قوچ', 'Taurus / گاو', 'Gemini / دوپیکر', 'Cancer / خرچنگ', 'Leo / شیر', 'Virgo / خوشه', 'Libra / ترازو', 'Scorpio / کژدم', 'Sagittarius / کمان', 'Capricorn / بزغاله', 'Aquarius / آبریز', 'Pisces / ماهی'];

function getCycleIndex(year, baseYear) {
  return ((year - baseYear) % 12 + 12) % 12;
}

function getSolarZodiacDetails(month, language = 'en') {
  const index = Math.max(0, Math.min(month - 1, solarZodiacSignsEn.length - 1));

  return {
    month: language === 'fa' ? solarMonthNamesFa[index] : solarMonthNamesEn[index],
    sign: language === 'fa' ? solarZodiacSignsFa[index] : solarZodiacSignsEn[index],
    western: language === 'fa' ? westernZodiacEquivalentsFa[index] : westernZodiacEquivalentsEn[index],
  };
}

function getGregorianMonthName(month, language = 'en') {
  const index = Math.max(0, Math.min(month - 1, gregorianMonthNamesEn.length - 1));
  return language === 'fa' ? gregorianMonthNamesFa[index] : gregorianMonthNamesEn[index];
}

function getIranianYearAnimal(year, language = 'en') {
  const animals = language === 'fa' ? iranianYearAnimalsFa : iranianYearAnimalsEn;
  return animals[getCycleIndex(year, 1399)];
}

function getChineseRelatedYear(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(date);
    const relatedYear = parts.find((part) => part.type === 'relatedYear')?.value;

    if (relatedYear) return Number(relatedYear);
  } catch {
    // Fall back to Gregorian year if the runtime does not support the Chinese calendar.
  }

  return date.getUTCFullYear();
}

function getChineseZodiacAnimal(date, language = 'en') {
  const animals = language === 'fa' ? chineseZodiacAnimalsFa : chineseZodiacAnimalsEn;
  return animals[getCycleIndex(getChineseRelatedYear(date), 4)];
}

function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isPersianLeapYear(year) {
  return getDaysInPersianMonth(year, 12) === 30;
}

function formatNumericCalendarTitle(date, calendarId, language = 'en') {
  const { year, month } = getCalendarPartsFromUtc(date, calendarId);
  const formatted = `${year}/${formatNumber(month)}`;

  if (language === 'fa') {
    return `\u200E${formatted}\u200E`;
  }

  return formatted;
}

function formatSelectedCalendarDate(date, calendarId, language = 'en') {
  const { year, month, day } = getCalendarPartsFromUtc(date, calendarId);
  const locale = language === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US-u-nu-latn';
  const weekday = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    calendar: calendarId === 'gregorian' ? 'gregory' : 'persian',
    weekday: 'long',
  }).format(date);

  return `${weekday} ${year}/${formatNumber(month)}/${formatNumber(day)}`;
}

function formatSyncedSelectedCalendarDate(date, primaryCalendarId, language = 'en', t = i18n.en) {
  const secondaryCalendarId = primaryCalendarId === 'gregorian' ? 'persian' : 'gregorian';
  const secondaryParts = getCalendarPartsFromUtc(date, secondaryCalendarId);
  const secondaryLabel = secondaryCalendarId === 'gregorian' ? t.gregorian : t.solar_hijri;

  return `${formatSelectedCalendarDate(date, primaryCalendarId, language)} · ${secondaryLabel} ${secondaryParts.year}/${formatNumber(secondaryParts.month)}/${formatNumber(secondaryParts.day)}`;
}

function buildYearOptions(calendarId, selectedYear) {
  const configuredYears = yearOptionsData[calendarId] || [];

  if (configuredYears.includes(selectedYear)) {
    return configuredYears;
  }

  return [...configuredYears, selectedYear].sort((a, b) => a - b);
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
    yearOptions: buildYearOptions('gregorian', monthStart.getUTCFullYear()),
    selectedLabel: formatSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, 'gregorian'),
    days: Array.from({ length: 42 }, (_, index) => {
      const dayDate = addUtcDays(gridStart, index);
      const dateKey = getCalendarDateKey(dayDate);
      const officialHolidays = getOfficialHolidayMatches(dayDate, 'gregorian');

      return {
        id: `gregorian-${dateKey}`,
        date: dayDate,
        dateKey,
        number: dayDate.getUTCDate(),
        isOutsideMonth: dayDate.getUTCMonth() !== monthStart.getUTCMonth(),
        isHoliday: officialHolidays.some((holiday) => holiday.status !== 'partial'),
        isPartialHoliday: officialHolidays.some((holiday) => holiday.status === 'partial'),
        officialHolidays,
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
    yearOptions: buildYearOptions('persian', targetMonth.year),
    selectedLabel: formatSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, 'persian'),
    days: Array.from({ length: 42 }, (_, index) => {
      const dayDate = addUtcDays(gridStart, index);
      const persianParts = getPersianDatePartsFromUtc(dayDate);
      const dateKey = getCalendarDateKey(dayDate);
      const officialHolidays = getOfficialHolidayMatches(dayDate, 'persian');

      return {
        id: `persian-${dateKey}`,
        date: dayDate,
        dateKey,
        number: persianParts.day,
        isOutsideMonth: persianParts.year !== targetMonth.year || persianParts.month !== targetMonth.month,
        isHoliday: officialHolidays.some((holiday) => holiday.status !== 'partial'),
        isPartialHoliday: officialHolidays.some((holiday) => holiday.status === 'partial'),
        officialHolidays,
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

function formatCalendarMonthTitle(date, calendarId, language = 'en') {
  return formatNumericCalendarTitle(date, calendarId, language);
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
    .map((event) => ({ ...event, type: 'international', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_international, dateLabel: `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}` }));
  const globalOfficialEvents = globalOfficialGregorianOccasions
    .filter((event) => event.month === gregorianParts.month && event.day === gregorianParts.day)
    .map((event) => ({ ...event, type: 'globalOfficial', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_global_official, dateLabel: `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}` }));
  const marketingEvents = marketingOccasions
    .filter((event) => event.month === gregorianParts.month && event.day === gregorianParts.day)
    .map((event) => ({ ...event, type: 'marketing', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_marketing, dateLabel: `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}` }));
  const iranEvents = iranOccasions
    .filter((event) => event.month === persianParts.month && event.day === persianParts.day)
    .map((event) => ({ ...event, type: 'iran', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_iran, dateLabel: `${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}` }));
  const iranCurrentEvents = iranCurrentPersianOccasions
    .filter((event) => event.month === persianParts.month && event.day === persianParts.day)
    .map((event) => ({ ...event, type: 'iranCurrent', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_iran_current, dateLabel: `${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}` }));
  const iranAncientEvents = iranAncientPahlaviOccasions
    .filter((event) => event.month === persianParts.month && event.day === persianParts.day)
    .map((event) => ({ ...event, type: 'iranAncient', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_iran_ancient, dateLabel: `${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}` }));
  const islamicEvents = iranIslamicOccasions
    .filter((event) => event.month === islamicParts.month && event.day === islamicParts.day)
    .map((event) => ({ ...event, type: 'islamic', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_islamic, dateLabel: `${islamicParts.day}/${islamicParts.month} AH` }));
  const islamicShiaEvents = islamicShiaOccasions
    .filter((event) => event.month === islamicParts.month && event.day === islamicParts.day)
    .map((event) => ({ ...event, type: 'islamicShia', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_islamic_shia, dateLabel: `${islamicParts.day}/${islamicParts.month} AH` }));
  const islamicSunniEvents = islamicSunniOccasions
    .filter((event) => event.month === islamicParts.month && event.day === islamicParts.day)
    .map((event) => ({ ...event, type: 'islamicSunni', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_islamic_sunni, dateLabel: `${islamicParts.day}/${islamicParts.month} AH` }));
  const islamicSharedEvents = islamicSharedOccasions
    .filter((event) => event.month === islamicParts.month && event.day === islamicParts.day)
    .map((event) => ({ ...event, type: 'islamicShared', title: getLocalizedOccasionTitle(event, language), calendar: t.calendar_islamic_shared, dateLabel: `${islamicParts.day}/${islamicParts.month} AH` }));

  return [...iranEvents, ...iranCurrentEvents, ...iranAncientEvents, ...islamicEvents, ...islamicShiaEvents, ...islamicSunniEvents, ...islamicSharedEvents, ...internationalEvents, ...globalOfficialEvents, ...marketingEvents];
}

function getMonthOccasionGroups(days, primaryCalendar, enabledOccasionTypes = ['iran', 'iranCurrent', 'iranAncient', 'international', 'globalOfficial', 'marketing', 'islamic', 'islamicShia', 'islamicSunni', 'islamicShared'], selectedDateKey = '') {
  return days
    .map((day) => {
      const events = Array.isArray(day.visibleEvents)
        ? day.visibleEvents
        : day.events.filter((event) => enabledOccasionTypes.includes(event.type));

      return {
        id: `occasion-${day.dateKey}`,
        dateKey: day.dateKey,
        primaryDate: day.primaryDate,
        secondaryDate: day.secondaryDate,
        title: `${day.primaryDate.month}/${formatNumber(day.primaryDate.day)}`,
        isOutsideMonth: day.isOutsideMonth,
        isSelected: day.dateKey === selectedDateKey,
        events,
      };
    })
    .filter((group) => !group.isOutsideMonth && group.events.length > 0);
}

function getSelectedOccasionGroup(calendar) {
  const selectedDateKey = calendar.days.find((day) => day.isSelected)?.dateKey;
  return calendar.occasions.find((group) => group.dateKey === selectedDateKey) || null;
}

function getOccasionInsight(event, language) {
  const key = event.title_fa || event.fa || event.title;
  const knownDescription = occasionDescriptions[key];

  if (knownDescription) {
    return {
      description: language === 'fa' ? knownDescription.description_fa : (knownDescription.description_en || knownDescription.description_fa),
      sourceLabel: knownDescription.source_label,
      sourceUrl: knownDescription.source_url,
    };
  }

  return {
    description: language === 'fa'
      ? `این مناسبت برای «${event.title}» ثبت شده است، اما هنوز توضیح تکمیلی برای آن اضافه نشده است.`
      : `This day marks “${event.title}”, but a detailed description has not been added yet.`,
    sourceLabel: '',
    sourceUrl: '',
  };
}

function getSyncedMonthCalendar(cityDate, primaryCalendar, monthOffset, selectedDateKey, t, language, enabledOccasionTypes = ['iran', 'iranCurrent', 'iranAncient', 'international', 'globalOfficial', 'marketing', 'islamic', 'islamicShia', 'islamicSunni', 'islamicShared']) {
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
    const officialHolidays = getOfficialHolidayMatches(dayDate, primaryCalendar);
    const events = getDateOccasions(dayDate, language, t);

    return {
      id: `synced-${primaryCalendar}-${dateKey}`,
      dateKey,
      primaryDate,
      secondaryDate: formatCompactCalendarDate(dayDate, secondaryCalendar),
      events,
      visibleEvents: events.filter((event) => enabledOccasionTypes.includes(event.type)),
      isHoliday: officialHolidays.some((holiday) => holiday.status !== 'partial'),
      isPartialHoliday: officialHolidays.some((holiday) => holiday.status === 'partial'),
      officialHolidays,
      isOutsideMonth: dayPrimaryParts.year !== primaryParts.year || dayPrimaryParts.month !== primaryParts.month,
      isToday: isSameUtcDay(dayDate, cityDate),
      isSelected: selectedDateKey === dateKey,
    };
  });

  return {
    id: primaryCalendar,
    secondaryId: secondaryCalendar,
    eyebrow: t.monthly_calendar,
    title: formatCalendarMonthTitle(monthStart, primaryCalendar, language),
    secondaryTitle: formatCalendarMonthTitle(monthStart, secondaryCalendar, language),
    weekdays: getLocalizedWeekdays(primaryCalendar === 'persian' ? 'persian' : 'gregorian', language),
    monthValue: primaryParts.month,
    monthOptions: getCalendarMonthOptions(primaryCalendar),
    yearValue: primaryParts.year,
    yearOptions: buildYearOptions(primaryCalendar, primaryParts.year),
    selectedLabel: formatSyncedSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, primaryCalendar, language, t),
    days,
    occasions: getMonthOccasionGroups(days, primaryCalendar, enabledOccasionTypes, selectedDateKey),
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


function getZonedTodayDate(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12));
}

function calculateDateDistance(startDate, endDate) {
  if (endDate.getTime() <= startDate.getTime()) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = endDate.getUTCFullYear() - startDate.getUTCFullYear();
  let months = endDate.getUTCMonth() - startDate.getUTCMonth();
  let days = endDate.getUTCDate() - startDate.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = endDate.getUTCMonth() === 0 ? 12 : endDate.getUTCMonth();
    const prevMonthYear = endDate.getUTCMonth() === 0 ? endDate.getUTCFullYear() - 1 : endDate.getUTCFullYear();
    days += getDaysInGregorianMonth(prevMonthYear, prevMonth);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

function getZonedDateTimeParts(date, timeZone) {
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

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtc(parts, timeZone) {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - offset * 60000);
  const correctedOffset = getTimeZoneOffsetMinutes(firstPass, timeZone);

  return correctedOffset === offset
    ? firstPass
    : new Date(utcGuess.getTime() - correctedOffset * 60000);
}

function addGregorianLocalDateTime(parts, { years = 0, months = 0, days = 0 } = {}) {
  const totalMonths = parts.month - 1 + months + years * 12;
  const year = parts.year + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12 + 1;
  const day = Math.min(parts.day, getDaysInGregorianMonth(year, month));
  const date = new Date(Date.UTC(year, month - 1, day + days, parts.hour, parts.minute, parts.second));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function getDateKeyMidnightUtc(dateKey, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return zonedDateTimeToUtc({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
}

function getBookmarkTargetUtc(bookmark, fallbackTimeZone) {
  const [year, month, day] = String(bookmark.dateKey || '').split('-').map(Number);
  const timeZone = bookmark.timeZone || fallbackTimeZone;

  return zonedDateTimeToUtc({
    year,
    month,
    day,
    hour: normalizeBookmarkTimePart(bookmark.hour, 23),
    minute: normalizeBookmarkTimePart(bookmark.minute, 59),
    second: normalizeBookmarkTimePart(bookmark.second, 59),
  }, timeZone);
}

function getCalendarDateKeyForParts(calendarType, year, month, day) {
  const date = calendarType === 'gregorian'
    ? new Date(Date.UTC(year, month - 1, day, 12))
    : findGregorianDateForPersianDate(year, month, day);

  return getCalendarDateKey(date);
}

function getBookmarkAnniversaryTargetUtc(bookmark, fromDate, fallbackTimeZone) {
  const timeZone = bookmark.timeZone || fallbackTimeZone;
  const originalTarget = getBookmarkTargetUtc(bookmark, timeZone);
  const effectGraceMilliseconds = 10000;
  if (originalTarget.getTime() >= fromDate.getTime() || fromDate.getTime() - originalTarget.getTime() <= effectGraceMilliseconds) {
    return originalTarget;
  }

  const localParts = getZonedDateTimeParts(fromDate, timeZone);
  const currentCalendarParts = bookmark.calendarType === 'gregorian'
    ? { year: localParts.year }
    : getPersianDateParts(fromDate, timeZone);

  const getCandidate = (targetYear) => {
    const maxDay = bookmark.calendarType === 'gregorian'
      ? getDaysInGregorianMonth(targetYear, bookmark.month)
      : getDaysInPersianMonth(targetYear, bookmark.month);
    const dateKey = getCalendarDateKeyForParts(bookmark.calendarType, targetYear, bookmark.month, Math.min(bookmark.day, maxDay));
    return getBookmarkTargetUtc({ ...bookmark, dateKey }, timeZone);
  };

  const candidate = getCandidate(currentCalendarParts.year);
  return candidate.getTime() >= fromDate.getTime() || fromDate.getTime() - candidate.getTime() <= effectGraceMilliseconds
    ? candidate
    : getCandidate(currentCalendarParts.year + 1);
}

function getPreciseZonedDistance(fromDate, targetDate, timeZone) {
  const isFuture = targetDate.getTime() >= fromDate.getTime();
  const earlierDate = isFuture ? fromDate : targetDate;
  const laterDate = isFuture ? targetDate : fromDate;
  const startParts = getZonedDateTimeParts(earlierDate, timeZone);
  const endParts = getZonedDateTimeParts(laterDate, timeZone);
  let years = Math.max(0, endParts.year - startParts.year);

  while (years > 0 && zonedDateTimeToUtc(addGregorianLocalDateTime(startParts, { years }), timeZone).getTime() > laterDate.getTime()) {
    years -= 1;
  }

  let cursorParts = addGregorianLocalDateTime(startParts, { years });
  let cursorDate = zonedDateTimeToUtc(cursorParts, timeZone);
  let months = Math.max(0, (endParts.year - cursorParts.year) * 12 + endParts.month - cursorParts.month);

  while (months > 0 && zonedDateTimeToUtc(addGregorianLocalDateTime(cursorParts, { months }), timeZone).getTime() > laterDate.getTime()) {
    months -= 1;
  }

  cursorParts = addGregorianLocalDateTime(cursorParts, { months });
  cursorDate = zonedDateTimeToUtc(cursorParts, timeZone);
  let days = 0;

  while (days < 31) {
    const nextParts = addGregorianLocalDateTime(cursorParts, { days: days + 1 });
    const nextDate = zonedDateTimeToUtc(nextParts, timeZone);

    if (nextDate.getTime() > laterDate.getTime()) {
      break;
    }

    days += 1;
    cursorDate = nextDate;
  }

  let remainingSeconds = Math.max(0, Math.floor((laterDate.getTime() - cursorDate.getTime()) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds -= hours * 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds - minutes * 60;

  return { isFuture, years, months, days, hours, minutes, seconds };
}

function getDateFromCalendarFields(fields) {
  return fields.calendarType === 'gregorian'
    ? new Date(Date.UTC(fields.year, fields.month - 1, fields.day, 12))
    : findGregorianDateForPersianDate(fields.year, fields.month, fields.day);
}

function getCurrentDateFieldsForCalendar(date, calendarType) {
  const parts = calendarType === 'gregorian'
    ? getCalendarPartsFromUtc(date, 'gregorian')
    : getPersianDatePartsFromUtc(date);

  return { calendarType, year: parts.year, month: parts.month, day: parts.day };
}

function DateFieldSet({ className = '', title, value, onChange, t, onFocus, onBlur }) {
  const selectedDate = getDateFromCalendarFields(value);
  const gregorianParts = getCalendarPartsFromUtc(selectedDate, 'gregorian');
  const persianParts = getPersianDatePartsFromUtc(selectedDate);
  const monthOptions = value.calendarType === 'gregorian' ? getCalendarMonthOptions('gregorian') : getCalendarMonthOptions('persian');
  const yearOptions = value.calendarType === 'gregorian'
    ? Array.from({ length: 2400 - 1900 + 1 }, (_, index) => 1900 + index)
    : Array.from({ length: 1700 - 1250 + 1 }, (_, index) => 1250 + index);
  const daysInMonth = value.calendarType === 'gregorian'
    ? getDaysInGregorianMonth(value.year, value.month)
    : getDaysInPersianMonth(value.year, value.month);
  const safeDay = Math.min(value.day, daysInMonth);
  const dayOptions = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const updateField = (nextFields) => onChange({ ...value, ...nextFields });
  const switchCalendar = (nextCalendarType) => {
    const nextParts = nextCalendarType === 'gregorian' ? gregorianParts : persianParts;
    onChange({ calendarType: nextCalendarType, year: nextParts.year, month: nextParts.month, day: nextParts.day });
  };

  return h(
    'section',
    { className: `date-field-set${className ? ` ${className}` : ''}` },
    h('header', { className: 'date-field-set__header' },
      h('strong', null, title),
      h('span', null, `${t.gregorian} ${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)} · ${t.solar_hijri} ${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}`),
    ),
    h('div', { className: 'date-field-set__controls' },
      h('label', null, t.calendar_type,
        h('select', { value: value.calendarType, onMouseDown: onFocus, onFocus, onBlur, onChange: (event) => switchCalendar(event.target.value) },
          h('option', { value: 'persian' }, t.solar_hijri),
          h('option', { value: 'gregorian' }, t.gregorian),
        ),
      ),
      h('label', null, t.year,
        h('select', {
          value: value.year,
          onMouseDown: onFocus,
          onFocus,
          onBlur,
          onChange: (event) => {
            const nextYear = Number(event.target.value);
            const nextDaysInMonth = value.calendarType === 'gregorian'
              ? getDaysInGregorianMonth(nextYear, value.month)
              : getDaysInPersianMonth(nextYear, value.month);
            updateField({ year: nextYear, day: Math.min(value.day, nextDaysInMonth) });
          },
        },
        yearOptions.map((optionYear) => h('option', { key: optionYear, value: optionYear }, optionYear)),
        ),
      ),
      h('label', null, t.month,
        h('select', {
          value: value.month,
          onMouseDown: onFocus,
          onFocus,
          onBlur,
          onChange: (event) => {
            const nextMonth = Number(event.target.value);
            const nextDaysInMonth = value.calendarType === 'gregorian'
              ? getDaysInGregorianMonth(value.year, nextMonth)
              : getDaysInPersianMonth(value.year, nextMonth);
            updateField({ month: nextMonth, day: Math.min(value.day, nextDaysInMonth) });
          },
        },
        monthOptions.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
        ),
      ),
      h('label', null, t.day,
        h('select', { value: safeDay, onMouseDown: onFocus, onFocus, onBlur, onChange: (event) => updateField({ day: Number(event.target.value) }) },
          dayOptions.map((optionDay) => h('option', { key: optionDay, value: optionDay }, optionDay)),
        ),
      ),
    ),
  );
}

const solarYearMomentRecords = [...solarYearMomentsData.moments].sort((first, second) => new Date(first.instantUtc).getTime() - new Date(second.instantUtc).getTime());

function getNearestSolarYearMoment(now) {
  return solarYearMomentRecords.find((record) => new Date(record.instantUtc).getTime() > now.getTime()) || solarYearMomentRecords[solarYearMomentRecords.length - 1];
}

function hasOfficialSolarYearMomentPrecision(record, date) {
  return record.precision === 'official' || record.officialSecondConfirmed === true || date.getUTCSeconds() !== 0;
}

function formatYearNumber(value, language = 'en') {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(locale, { useGrouping: false }).format(value);
}

function formatTwoDigitNumber(value, language = 'en') {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false }).format(value);
}

function formatZonedMoment(date, timeZone, language = 'en') {
  return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function formatUtcMoment(date, language = 'en') {
  return [
    `${formatYearNumber(date.getUTCFullYear(), language)}/${formatTwoDigitNumber(date.getUTCMonth() + 1, language)}/${formatTwoDigitNumber(date.getUTCDate(), language)}`,
    `${formatTwoDigitNumber(date.getUTCHours(), language)}:${formatTwoDigitNumber(date.getUTCMinutes(), language)}:${formatTwoDigitNumber(date.getUTCSeconds(), language)}`,
  ].join(' ');
}

function getDurationParts(milliseconds) {
  let seconds = Math.max(0, Math.floor(Math.abs(milliseconds) / 1000));
  const days = Math.floor(seconds / 86400);
  seconds -= days * 86400;
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  return { days, hours, minutes, seconds };
}

function SolarYearMomentCard({ now, t, language }) {
  const nextMoment = getNearestSolarYearMoment(now);
  const [selectedYear, setSelectedYear] = useState(nextMoment.persianYear);
  const selectedMoment = solarYearMomentRecords.find((record) => record.persianYear === Number(selectedYear)) || nextMoment;
  const selectedDate = new Date(selectedMoment.instantUtc);
  const remainingMilliseconds = selectedDate.getTime() - now.getTime();
  const durationParts = getDurationParts(remainingMilliseconds);
  const durationTitle = remainingMilliseconds >= 0 ? t.time_remaining : t.time_elapsed;
  const precisionLabel = hasOfficialSolarYearMomentPrecision(selectedMoment, selectedDate) ? t.official_precision : t.minute_precision;

  return h(
    'section',
    { className: 'solar-year-card', 'aria-label': t.solar_year_moment_title },
    h('div', { className: 'solar-year-card__header' },
      h('div', null,
        h('strong', null, t.solar_year_moment_title),
        h('span', null, `${t.data_precision}: ${precisionLabel}`),
      ),
      h('select', {
        value: selectedMoment.persianYear,
        'aria-label': t.solar_year_select,
        onChange: (event) => setSelectedYear(Number(event.target.value)),
      },
      solarYearMomentRecords.map((record) => h(
        'option',
        { key: record.persianYear, value: record.persianYear },
        `${formatYearNumber(record.persianYear, language)} / ${formatYearNumber(record.gregorianYear, language)}`,
      )),
      ),
    ),
    h('div', { className: 'solar-year-card__body' },
      h('div', { className: 'solar-year-card__year' },
        h('span', null, t.solar_year),
        h('strong', null, formatYearNumber(selectedMoment.persianYear, language)),
      ),
      h(InfoPill, { label: t.iran_time, value: formatZonedMoment(selectedDate, solarYearMomentsData.timeZone, language) }),
      h(InfoPill, { label: t.utc_time, value: formatUtcMoment(selectedDate, language) }),
      h(SplitPill, { label: durationTitle, items: [
        { label: t.days, value: formatLocaleNumber(durationParts.days, language) },
        { label: t.hour, value: formatLocaleNumber(durationParts.hours, language) },
        { label: t.minute, value: formatLocaleNumber(durationParts.minutes, language) },
        { label: t.second, value: formatLocaleNumber(durationParts.seconds, language) },
      ] }),
    ),
  );
}

function BookmarkEffectOverlay({ effect, palette = 'multicolor' }) {
  const isBalloons = effect === 'balloons';
  const itemsPerWave = isBalloons ? 30 : 76;
  const waves = 7;
  const items = Array.from({ length: itemsPerWave * waves }, (_, index) => index);

  return h(
    'div',
    { className: `bookmark-effect bookmark-effect--${effect} bookmark-effect--palette-${normalizeBookmarkEffectPalette(palette)}`, 'aria-hidden': 'true' },
    items.map((index) => h('span', {
      key: index,
      style: {
        '--i': String(index),
        '--x': `${2 + ((index * 37 + Math.floor(index / 12) * 11) % 96)}%`,
        '--delay': `${Math.floor(index / itemsPerWave) * 0.55 + (index % 18) * 0.018 - 0.08}s`,
        '--duration': `${isBalloons ? 6 + (index % 10) * 0.08 : 5.8 + (index % 11) * 0.075}s`,
        '--spin': `${(index % 2 ? 1 : -1) * (180 + (index % 11) * 24)}deg`,
        '--drift': `${((index % 11) - 5) * (isBalloons ? 3.8 : 3)}vw`,
      },
    })),
  );
}

const fullscreenControlsAutoHideDelay = 1400;

function useFullscreenControlsAutoHide(isFullscreen, setControlsVisible) {
  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      return undefined;
    }

    let hideTimer = null;
    let revealFrame = 0;
    const scheduleHide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setControlsVisible(false), fullscreenControlsAutoHideDelay);
    };
    const revealControls = () => {
      if (revealFrame) return;
      revealFrame = window.requestAnimationFrame(() => {
        revealFrame = 0;
        setControlsVisible(true);
        scheduleHide();
      });
    };

    revealControls();
    document.addEventListener('pointermove', revealControls, { passive: true });
    document.addEventListener('mousemove', revealControls, { passive: true });
    document.addEventListener('pointerdown', revealControls);
    document.addEventListener('keydown', revealControls);
    document.addEventListener('touchstart', revealControls, { passive: true });

    return () => {
      window.clearTimeout(hideTimer);
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
      document.removeEventListener('pointermove', revealControls);
      document.removeEventListener('mousemove', revealControls);
      document.removeEventListener('pointerdown', revealControls);
      document.removeEventListener('keydown', revealControls);
      document.removeEventListener('touchstart', revealControls);
    };
  }, [isFullscreen]);
}

function useFallbackFullscreenMode(isActive, onExit, portalSelector = '') {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const portalElement = portalSelector ? document.querySelector(portalSelector) : null;
    const portalParent = portalElement?.parentNode || null;
    const portalMarker = portalElement ? document.createComment('app-viewport-fullscreen-marker') : null;

    if (portalElement && portalParent && portalMarker) {
      portalParent.insertBefore(portalMarker, portalElement);
      document.body.appendChild(portalElement);
    }

    const controlsElement = portalElement?.querySelector('.selected-bookmark-timer__top-controls') || null;
    const controlsParent = controlsElement?.parentNode || null;
    const controlsMarker = controlsElement ? document.createComment('app-viewport-fullscreen-controls-marker') : null;
    const previousControlsStyles = controlsElement
      ? {
        position: controlsElement.style.position,
        top: controlsElement.style.top,
        left: controlsElement.style.left,
        right: controlsElement.style.right,
        bottom: controlsElement.style.bottom,
        zIndex: controlsElement.style.zIndex,
      }
      : null;

    if (controlsElement && controlsParent && controlsMarker) {
      controlsParent.insertBefore(controlsMarker, controlsElement);
      document.body.appendChild(controlsElement);
    }

    document.documentElement.classList.add('app-viewport-fullscreen-active');
    document.body.classList.add('app-viewport-fullscreen-active');

    const syncViewportFullscreenMetrics = () => {
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop || 0) + 16;
      if (controlsElement) {
        controlsElement.style.position = 'fixed';
        controlsElement.style.top = `${top}px`;
        controlsElement.style.left = 'auto';
        controlsElement.style.right = 'auto';
        controlsElement.style.bottom = 'auto';
        controlsElement.style.zIndex = '2147483600';
      }
    };
    const preventPageScroll = (event) => {
      event.preventDefault();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onExit();
      }
    };

    syncViewportFullscreenMetrics();
    window.addEventListener('resize', syncViewportFullscreenMetrics);
    window.visualViewport?.addEventListener('resize', syncViewportFullscreenMetrics);
    window.visualViewport?.addEventListener('scroll', syncViewportFullscreenMetrics);
    document.addEventListener('wheel', preventPageScroll, { passive: false });
    document.addEventListener('touchmove', preventPageScroll, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('app-viewport-fullscreen-active');
      document.body.classList.remove('app-viewport-fullscreen-active');
      if (controlsElement && controlsMarker?.parentNode) {
        if (previousControlsStyles) {
          controlsElement.style.position = previousControlsStyles.position;
          controlsElement.style.top = previousControlsStyles.top;
          controlsElement.style.left = previousControlsStyles.left;
          controlsElement.style.right = previousControlsStyles.right;
          controlsElement.style.bottom = previousControlsStyles.bottom;
          controlsElement.style.zIndex = previousControlsStyles.zIndex;
        }
        controlsMarker.parentNode.insertBefore(controlsElement, controlsMarker);
        controlsMarker.parentNode.removeChild(controlsMarker);
      }
      if (portalElement && portalMarker?.parentNode) {
        portalMarker.parentNode.insertBefore(portalElement, portalMarker);
        portalMarker.parentNode.removeChild(portalMarker);
      }
      window.scrollTo(scrollX, scrollY);
      window.removeEventListener('resize', syncViewportFullscreenMetrics);
      window.visualViewport?.removeEventListener('resize', syncViewportFullscreenMetrics);
      window.visualViewport?.removeEventListener('scroll', syncViewportFullscreenMetrics);
      document.removeEventListener('wheel', preventPageScroll);
      document.removeEventListener('touchmove', preventPageScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);
}

function shouldPreferViewportFullscreenFallback() {
  return Boolean(
    window.matchMedia?.('(max-width: 900px)').matches
    || window.matchMedia?.('(pointer: coarse)').matches
  );
}

function AgeConverterCard({ city, timeZoneOptions = [], t, language, timeOffset = 0, fullscreenBackground = 'dark', timeOfDay = 'night', onFullscreenBackgroundToggle = () => {}, onInteractionChange = () => {} }) {
  const todayDate = getZonedTodayDate(city.timeZone);
  const todayPersian = getPersianDatePartsFromUtc(todayDate);
  const [calculatorMode, setCalculatorMode] = useState('convert');
  const [calendarType, setCalendarType] = useState('persian');
  const [year, setYear] = useState(todayPersian.year);
  const [month, setMonth] = useState(todayPersian.month);
  const [day, setDay] = useState(todayPersian.day);
  const [differenceStartDate, setDifferenceStartDate] = useState(() => getCurrentDateFieldsForCalendar(todayDate, 'persian'));
  const [differenceEndDate, setDifferenceEndDate] = useState(() => getCurrentDateFieldsForCalendar(todayDate, 'gregorian'));
  const [offsetOrigin, setOffsetOrigin] = useState('today');
  const [offsetDirection, setOffsetDirection] = useState('after');
  const [offsetDays, setOffsetDays] = useState('36');
  const [offsetBaseDate, setOffsetBaseDate] = useState(() => getCurrentDateFieldsForCalendar(todayDate, 'persian'));
  const [dateBookmarks, setDateBookmarks] = useState(getInitialDateBookmarks);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState('');
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [bookmarkHour, setBookmarkHour] = useState(0);
  const [bookmarkMinute, setBookmarkMinute] = useState(0);
  const [bookmarkSecond, setBookmarkSecond] = useState(0);
  const [bookmarkTimeZone, setBookmarkTimeZone] = useState(city.timeZone);
  const [bookmarkEffect, setBookmarkEffect] = useState('none');
  const [bookmarkEffectPalette, setBookmarkEffectPalette] = useState('multicolor');
  const [bookmarkShowDescriptionInTimer, setBookmarkShowDescriptionInTimer] = useState(false);
  const [activeBookmarkActionsId, setActiveBookmarkActionsId] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState('');
  const [editingBookmarkTitle, setEditingBookmarkTitle] = useState('');
  const [editingBookmarkDescription, setEditingBookmarkDescription] = useState('');
  const [editingBookmarkHour, setEditingBookmarkHour] = useState(0);
  const [editingBookmarkMinute, setEditingBookmarkMinute] = useState(0);
  const [editingBookmarkSecond, setEditingBookmarkSecond] = useState(0);
  const [editingBookmarkTimeZone, setEditingBookmarkTimeZone] = useState(city.timeZone);
  const [editingBookmarkEffect, setEditingBookmarkEffect] = useState('none');
  const [editingBookmarkEffectPalette, setEditingBookmarkEffectPalette] = useState('multicolor');
  const [editingBookmarkShowDescriptionInTimer, setEditingBookmarkShowDescriptionInTimer] = useState(false);
  const [editingBookmarkCalendarType, setEditingBookmarkCalendarType] = useState('persian');
  const [editingBookmarkYear, setEditingBookmarkYear] = useState(todayPersian.year);
  const [editingBookmarkMonth, setEditingBookmarkMonth] = useState(todayPersian.month);
  const [editingBookmarkDay, setEditingBookmarkDay] = useState(todayPersian.day);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('');
  const [bookmarkNow, setBookmarkNow] = useState(() => new Date(Date.now() + timeOffset));
  const [isConverterPickerActive, setIsConverterPickerActive] = useState(false);
  const [isBookmarkTimerNativeFullscreen, setIsBookmarkTimerNativeFullscreen] = useState(false);
  const [isBookmarkTimerFallbackFullscreen, setIsBookmarkTimerFallbackFullscreen] = useState(false);
  const [bookmarkFullscreenControlsVisible, setBookmarkFullscreenControlsVisible] = useState(true);
  const [bookmarkEffectWatch, setBookmarkEffectWatch] = useState(null);
  const [firedBookmarkEffectKey, setFiredBookmarkEffectKey] = useState('');
  const [activeBookmarkEffect, setActiveBookmarkEffect] = useState(null);
  const handleFocusIn = () => {
    setIsConverterPickerActive(true);
    onInteractionChange(true);
  };
  const handleFocusOut = () => {
    setIsConverterPickerActive(false);
    if (!editingBookmarkId) {
      onInteractionChange(false);
    }
  };
  const bookmarkEffectOptions = [
    { id: 'none', label: t.bookmark_effect_none },
    { id: 'ribbons', label: t.bookmark_effect_ribbons },
    { id: 'balloons', label: t.bookmark_effect_balloons },
  ];
  const bookmarkEffectPaletteOptions = [
    { id: 'white_pink', label: t.bookmark_effect_palette_white_pink },
    { id: 'white_blue', label: t.bookmark_effect_palette_white_blue },
    { id: 'white_red', label: t.bookmark_effect_palette_white_red },
    { id: 'white_black', label: t.bookmark_effect_palette_white_black },
    { id: 'black', label: t.bookmark_effect_palette_black },
    { id: 'multicolor', label: t.bookmark_effect_palette_multicolor },
  ];
  const isBookmarkTimerFullscreen = isBookmarkTimerNativeFullscreen || isBookmarkTimerFallbackFullscreen;
  const bookmarkTimeZoneOptions = [
    city,
    ...timeZoneOptions,
  ].filter(Boolean).reduce((options, option) => {
    if (!option.timeZone || options.some((item) => item.timeZone === option.timeZone)) return options;
    options.push(option);
    return options;
  }, []);
  const hourOptions = Array.from({ length: 24 }, (_, index) => index);
  const minuteSecondOptions = Array.from({ length: 60 }, (_, index) => index);
  const getTimeZoneOptionLabel = (option) => {
    const label = language === 'fa' ? (option.localFaLabel || option.label) : option.label;
    const country = language === 'fa' ? (option.localFaCountry || option.country) : option.country;
    return country ? `${label}، ${country}` : label;
  };
  const getBookmarkDescriptionValue = (bookmark) => String(bookmark?.description || '').trim();
  const syncBookmarkFormState = (bookmark) => {
    setBookmarkTitle(bookmark.title);
    setBookmarkDescription(getBookmarkDescriptionValue(bookmark));
    setBookmarkHour(normalizeBookmarkTimePart(bookmark.hour, 23));
    setBookmarkMinute(normalizeBookmarkTimePart(bookmark.minute, 59));
    setBookmarkSecond(normalizeBookmarkTimePart(bookmark.second, 59));
    setBookmarkTimeZone(bookmark.timeZone || city.timeZone);
    setBookmarkEffect(getBookmarkEffectType(bookmark));
    setBookmarkEffectPalette(getBookmarkEffectPalette(bookmark));
    setBookmarkShowDescriptionInTimer(Boolean(bookmark.showDescriptionInTimer));
  };

  const monthOptions = calendarType === 'gregorian' ? getCalendarMonthOptions('gregorian') : getCalendarMonthOptions('persian');
  const daysInMonth = calendarType === 'gregorian' ? getDaysInGregorianMonth(year, month) : getDaysInPersianMonth(year, month);
  const yearOptions = calendarType === 'gregorian'
    ? Array.from({ length: 2400 - 1900 + 1 }, (_, index) => 1900 + index)
    : Array.from({ length: 1700 - 1250 + 1 }, (_, index) => 1250 + index);
  const dayOptions = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const differenceStartUtc = getDateFromCalendarFields(differenceStartDate);
  const differenceEndUtc = getDateFromCalendarFields(differenceEndDate);
  const differenceEarlierDate = differenceStartUtc.getTime() <= differenceEndUtc.getTime() ? differenceStartUtc : differenceEndUtc;
  const differenceLaterDate = differenceStartUtc.getTime() <= differenceEndUtc.getTime() ? differenceEndUtc : differenceStartUtc;
  const differenceDistance = calculateDateDistance(differenceEarlierDate, differenceLaterDate);
  const differenceTotalDays = Math.round(Math.abs(differenceEndUtc.getTime() - differenceStartUtc.getTime()) / dayInMilliseconds);
  const differenceTotalWeeks = Math.floor(differenceTotalDays / 7);
  const differenceTotalMonths = differenceDistance.years * 12 + differenceDistance.months;
  const differenceDistanceLabel = language === 'fa'
    ? `${formatLocaleNumber(differenceDistance.years, language)} سال ${formatLocaleNumber(differenceDistance.months, language)} ماه ${formatLocaleNumber(differenceDistance.days, language)} روز`
    : `${formatLocaleNumber(differenceDistance.years, language)}y ${formatLocaleNumber(differenceDistance.months, language)}m ${formatLocaleNumber(differenceDistance.days, language)}d`;
  const normalizedOffsetDays = Math.min(100000, Math.max(0, Number.parseInt(offsetDays, 10) || 0));
  const offsetStartDate = offsetOrigin === 'today' ? todayDate : getDateFromCalendarFields(offsetBaseDate);
  const offsetResultDate = new Date(offsetStartDate.getTime());
  offsetResultDate.setUTCDate(offsetResultDate.getUTCDate() + (offsetDirection === 'before' ? -normalizedOffsetDays : normalizedOffsetDays));
  const offsetStartGregorian = getCalendarPartsFromUtc(offsetStartDate, 'gregorian');
  const offsetResultGregorian = getCalendarPartsFromUtc(offsetResultDate, 'gregorian');
  const offsetResultPersian = getPersianDatePartsFromUtc(offsetResultDate);
  const offsetResultWeekday = new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US', {
    timeZone: 'UTC',
    weekday: 'long',
  }).format(offsetResultDate);
  const offsetStartLabel = `${offsetStartGregorian.year}/${formatNumber(offsetStartGregorian.month)}/${formatNumber(offsetStartGregorian.day)}`;
  const offsetSummary = language === 'fa'
    ? `${formatLocaleNumber(normalizedOffsetDays, language)} روز ${offsetDirection === 'before' ? t.before : t.after} از ${offsetStartLabel}`
    : `${formatLocaleNumber(normalizedOffsetDays, language)} ${t.days} ${offsetDirection === 'before' ? t.before.toLowerCase() : t.after.toLowerCase()} ${offsetStartLabel}`;

  const resetConverterDateForCalendar = (nextCalendarType) => {
    const nextTodayDate = getZonedTodayDate(city.timeZone);
    const nextParts = nextCalendarType === 'gregorian'
      ? getCalendarPartsFromUtc(nextTodayDate, 'gregorian')
      : getPersianDatePartsFromUtc(nextTodayDate);

    resetBookmarkSelection();
    setCalendarType(nextCalendarType);
    setYear(nextParts.year);
    setMonth(nextParts.month);
    setDay(nextParts.day);
  };

  useEffect(() => {
    setDay((current) => Math.min(current, daysInMonth));
  }, [daysInMonth]);

  useEffect(() => {
    localStorage.setItem(savedDateBookmarksKey, JSON.stringify(dateBookmarks));
  }, [dateBookmarks]);

  useEffect(() => {
    if (!selectedBookmark || editingBookmarkId || isConverterPickerActive) {
      return undefined;
    }

    const updateBookmarkNow = () => setBookmarkNow(new Date(Date.now() + timeOffset));
    updateBookmarkNow();
    const timer = setInterval(updateBookmarkNow, 1000);

    return () => clearInterval(timer);
  }, [editingBookmarkId, isConverterPickerActive, selectedBookmarkId, timeOffset]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement?.classList?.contains('selected-bookmark-timer'));
      setIsBookmarkTimerNativeFullscreen(isFullscreen);
      if (document.fullscreenElement) {
        setIsBookmarkTimerFallbackFullscreen(false);
      }
      setBookmarkFullscreenControlsVisible(isFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useFallbackFullscreenMode(
    isBookmarkTimerFallbackFullscreen,
    () => setIsBookmarkTimerFallbackFullscreen(false),
    '.selected-bookmark-timer',
  );
  useFullscreenControlsAutoHide(isBookmarkTimerFullscreen, setBookmarkFullscreenControlsVisible);

  const toggleBookmarkTimerFullscreen = () => {
    const timerElement = document.querySelector('.selected-bookmark-timer');
    if (!timerElement) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    if (isBookmarkTimerFallbackFullscreen) {
      setIsBookmarkTimerFallbackFullscreen(false);
      return;
    }

    if (shouldPreferViewportFullscreenFallback()) {
      setIsBookmarkTimerFallbackFullscreen(true);
      setBookmarkFullscreenControlsVisible(true);
      return;
    }

    if (timerElement.requestFullscreen) {
      timerElement.requestFullscreen().catch(() => {
        setIsBookmarkTimerFallbackFullscreen(true);
        setBookmarkFullscreenControlsVisible(true);
      });
      return;
    }

    setIsBookmarkTimerFallbackFullscreen(true);
    setBookmarkFullscreenControlsVisible(true);
  };

  const runSelectedBookmarkEffect = () => {
    if (!selectedBookmark || !isBookmarkTimerFullscreen) return;
    const effect = getBookmarkEffectType(selectedBookmark);
    const palette = getBookmarkEffectPalette(selectedBookmark);
    if (effect === 'none') return;

    setActiveBookmarkEffect({ id: effect, palette, key: `manual:${selectedBookmark.id}:${effect}:${palette}:${Date.now()}` });
  };

  useEffect(() => {
    if (!editingBookmarkId) {
      return undefined;
    }

    onInteractionChange(true);
    return () => onInteractionChange(false);
  }, [editingBookmarkId]);

  useEffect(() => {
    if (!selectedBookmarkId && !editingBookmarkId) {
      setBookmarkTimeZone(city.timeZone);
    }
  }, [city.timeZone, editingBookmarkId, selectedBookmarkId]);

  const convertedDate = useMemo(() => {
    if (calendarType === 'gregorian') {
      return new Date(Date.UTC(year, month - 1, day, 12));
    }

    return findGregorianDateForPersianDate(year, month, day);
  }, [calendarType, year, month, day]);

  const gregorianParts = getCalendarPartsFromUtc(convertedDate, 'gregorian');
  const persianParts = getPersianDatePartsFromUtc(convertedDate);
  const isFutureDate = convertedDate.getTime() > todayDate.getTime();
  const isPastDate = convertedDate.getTime() < todayDate.getTime();
  const timeDistance = isFutureDate ? calculateDateDistance(todayDate, convertedDate) : calculateDateDistance(convertedDate, todayDate);
  const timeDistanceTitle = isPastDate ? t.time_elapsed : t.time_remaining;
  const weekdayLabel = new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US', { timeZone: city.timeZone, weekday: 'long' }).format(convertedDate);
  const leapYearLabel = calendarType === 'gregorian'
    ? (isGregorianLeapYear(gregorianParts.year) ? t.yes : t.no)
    : (isPersianLeapYear(persianParts.year) ? t.yes : t.no);
  const solarZodiacDetails = getSolarZodiacDetails(persianParts.month, language);
  const gregorianMonthName = getGregorianMonthName(gregorianParts.month, language);
  const iranianYearAnimal = getIranianYearAnimal(persianParts.year, language);
  const chineseZodiac = getChineseZodiacAnimal(convertedDate, language);
  const selectedBookmark = dateBookmarks.find((bookmark) => bookmark.id === selectedBookmarkId);
  useEffect(() => {
    if (!selectedBookmark) return;
    syncBookmarkFormState(selectedBookmark);
  }, [selectedBookmark, city.timeZone]);
  const selectedBookmarkTimer = selectedBookmark
    ? getPreciseZonedDistance(bookmarkNow, getBookmarkTargetUtc(selectedBookmark, city.timeZone), selectedBookmark.timeZone || city.timeZone)
    : null;
  const selectedBookmarkTimerTitle = selectedBookmark && selectedBookmarkTimer
    ? language === 'fa'
      ? `${selectedBookmarkTimer.isFuture ? t.time_remaining : t.time_elapsed} ${selectedBookmarkTimer.isFuture ? 'برای' : 'از'} ${selectedBookmark.title}`
      : `${selectedBookmarkTimer.isFuture ? t.time_remaining : t.time_elapsed} ${selectedBookmarkTimer.isFuture ? 'for' : 'since'} ${selectedBookmark.title}`
    : '';
  const selectedBookmarkTimerDescription = selectedBookmark?.showDescriptionInTimer ? String(selectedBookmark.description || '').trim() : '';
  useEffect(() => {
    if (!activeBookmarkEffect) return undefined;

    const timer = window.setTimeout(() => setActiveBookmarkEffect(null), 11000);
    return () => window.clearTimeout(timer);
  }, [activeBookmarkEffect]);

  useEffect(() => {
    if (!selectedBookmark || !isBookmarkTimerFullscreen || getBookmarkEffectType(selectedBookmark) === 'none') {
      setBookmarkEffectWatch(null);
      return;
    }

    const targetDate = getBookmarkAnniversaryTargetUtc(selectedBookmark, bookmarkNow, city.timeZone);
    const targetTime = targetDate.getTime();
    const remainingMilliseconds = targetTime - bookmarkNow.getTime();
    const effect = getBookmarkEffectType(selectedBookmark);
    const palette = getBookmarkEffectPalette(selectedBookmark);
    const effectKey = `${selectedBookmark.id}:${targetTime}:${effect}:${palette}`;
    const crossedZero = bookmarkEffectWatch?.key === effectKey
      ? bookmarkEffectWatch.remainingMilliseconds > 0 && remainingMilliseconds <= 0
      : remainingMilliseconds <= 0 && remainingMilliseconds > -1500;

    if (crossedZero && firedBookmarkEffectKey !== effectKey) {
      setFiredBookmarkEffectKey(effectKey);
      setActiveBookmarkEffect({ id: effect, palette, key: `${effectKey}:${Date.now()}` });
    }

    setBookmarkEffectWatch((current) => (
      current?.key === effectKey && current.remainingMilliseconds === remainingMilliseconds
        ? current
        : { key: effectKey, remainingMilliseconds }
    ));
  }, [bookmarkNow, bookmarkEffectWatch, city.timeZone, firedBookmarkEffectKey, isBookmarkTimerFullscreen, selectedBookmark]);
  const timeDistanceLabel = language === 'fa'
    ? `${formatLocaleNumber(timeDistance.years, language)} سال ${formatLocaleNumber(timeDistance.months, language)} ماه ${formatLocaleNumber(timeDistance.days, language)} روز`
    : `${formatLocaleNumber(timeDistance.years, language)}y ${formatLocaleNumber(timeDistance.months, language)}m ${formatLocaleNumber(timeDistance.days, language)}d`;
  const currentDateKey = getCalendarDateKey(convertedDate);
  const currentDateTitle = `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}`;
  const getBookmarkTitle = () => `${t.bookmark_default_title} ${currentDateTitle}`;
  const buildCurrentBookmark = (id = `date-${Date.now()}`, title = getBookmarkTitle(), description = '', createdAt = new Date().toISOString(), showDescriptionInTimer = bookmarkShowDescriptionInTimer) => ({
    id,
    title: title.trim() || getBookmarkTitle(),
    description: description.trim(),
    showDescriptionInTimer: Boolean(showDescriptionInTimer),
    calendarType,
    year,
    month,
    day,
    dateKey: currentDateKey,
    hour: normalizeBookmarkTimePart(bookmarkHour, 23),
    minute: normalizeBookmarkTimePart(bookmarkMinute, 59),
    second: normalizeBookmarkTimePart(bookmarkSecond, 59),
    timeZone: bookmarkTimeZone || city.timeZone,
    effect: normalizeBookmarkEffect(bookmarkEffect),
    effectType: normalizeBookmarkEffect(bookmarkEffect),
    effectPalette: normalizeBookmarkEffectPalette(bookmarkEffectPalette),
    createdAt,
    updatedAt: new Date().toISOString(),
  });

  const getBookmarkDateFromFields = (bookmarkCalendarType, bookmarkYear, bookmarkMonth, bookmarkDay) => (
    bookmarkCalendarType === 'gregorian'
      ? new Date(Date.UTC(bookmarkYear, bookmarkMonth - 1, bookmarkDay, 12))
      : findGregorianDateForPersianDate(bookmarkYear, bookmarkMonth, bookmarkDay)
  );

  const resetBookmarkSelection = () => {
    setSelectedBookmarkId('');
    setEditingBookmarkId('');
    setActiveBookmarkActionsId('');
    setConfirmingDeleteId('');
  };

  const saveCurrentBookmark = () => {
    const existingBookmark = selectedBookmark || dateBookmarks.find((bookmark) => bookmark.dateKey === currentDateKey);
    const nextTitle = bookmarkTitle.trim() || existingBookmark?.title || getBookmarkTitle();
    const nextDescription = bookmarkDescription.trim();
    const nextBookmark = buildCurrentBookmark(existingBookmark?.id, nextTitle, nextDescription, existingBookmark?.createdAt);

    setDateBookmarks((bookmarks) => existingBookmark
      ? bookmarks.map((bookmark) => (bookmark.id === existingBookmark.id ? nextBookmark : bookmark))
      : [nextBookmark, ...bookmarks]);
    setSelectedBookmarkId(nextBookmark.id);
    setEditingBookmarkId('');
    setActiveBookmarkActionsId('');
    setConfirmingDeleteId('');
    syncBookmarkFormState(nextBookmark);
  };

  const selectBookmark = (bookmark) => {
    if (selectedBookmarkId === bookmark.id) {
      setSelectedBookmarkId('');
      setEditingBookmarkId('');
      setActiveBookmarkActionsId('');
      setConfirmingDeleteId('');
      setActiveBookmarkEffect(null);
      setBookmarkEffectWatch(null);
      return;
    }

    setCalendarType(bookmark.calendarType);
    setYear(bookmark.year);
    setMonth(bookmark.month);
    setDay(bookmark.day);
    setSelectedBookmarkId(bookmark.id);
    syncBookmarkFormState(bookmark);
    setEditingBookmarkId('');
    setConfirmingDeleteId('');
    setActiveBookmarkEffect(null);
    setBookmarkEffectWatch(null);
  };

  const startEditingBookmark = (bookmark) => {
    setSelectedBookmarkId(bookmark.id);
    setActiveBookmarkActionsId(bookmark.id);
    setConfirmingDeleteId('');
    setEditingBookmarkId(bookmark.id);
    setEditingBookmarkTitle(bookmark.title);
    setEditingBookmarkDescription(bookmark.description || '');
    setEditingBookmarkHour(normalizeBookmarkTimePart(bookmark.hour, 23));
    setEditingBookmarkMinute(normalizeBookmarkTimePart(bookmark.minute, 59));
    setEditingBookmarkSecond(normalizeBookmarkTimePart(bookmark.second, 59));
    setEditingBookmarkTimeZone(bookmark.timeZone || city.timeZone);
    setEditingBookmarkEffect(getBookmarkEffectType(bookmark));
    setEditingBookmarkEffectPalette(getBookmarkEffectPalette(bookmark));
    setEditingBookmarkShowDescriptionInTimer(Boolean(bookmark.showDescriptionInTimer));
    setEditingBookmarkCalendarType(bookmark.calendarType);
    setEditingBookmarkYear(bookmark.year);
    setEditingBookmarkMonth(bookmark.month);
    setEditingBookmarkDay(bookmark.day);
  };

  const saveBookmarkDetails = (bookmark) => {
    const nextTitle = editingBookmarkTitle.trim() || bookmark.title;
    const nextDescription = editingBookmarkDescription.trim();
    const maxEditingDay = editingBookmarkCalendarType === 'gregorian'
      ? getDaysInGregorianMonth(editingBookmarkYear, editingBookmarkMonth)
      : getDaysInPersianMonth(editingBookmarkYear, editingBookmarkMonth);
    const nextDay = Math.min(editingBookmarkDay, maxEditingDay);
    const nextDate = getBookmarkDateFromFields(editingBookmarkCalendarType, editingBookmarkYear, editingBookmarkMonth, nextDay);
    const nextDateKey = getCalendarDateKey(nextDate);

    setDateBookmarks((bookmarks) => bookmarks.map((item) => (
      item.id === bookmark.id
        ? {
          ...item,
          title: nextTitle,
          description: nextDescription,
          calendarType: editingBookmarkCalendarType,
          year: editingBookmarkYear,
          month: editingBookmarkMonth,
          day: nextDay,
          dateKey: nextDateKey,
          hour: normalizeBookmarkTimePart(editingBookmarkHour, 23),
          minute: normalizeBookmarkTimePart(editingBookmarkMinute, 59),
          second: normalizeBookmarkTimePart(editingBookmarkSecond, 59),
          timeZone: editingBookmarkTimeZone || city.timeZone,
          effect: normalizeBookmarkEffect(editingBookmarkEffect),
          effectType: normalizeBookmarkEffect(editingBookmarkEffect),
          effectPalette: normalizeBookmarkEffectPalette(editingBookmarkEffectPalette),
          showDescriptionInTimer: Boolean(editingBookmarkShowDescriptionInTimer),
          updatedAt: new Date().toISOString(),
        }
        : item
    )));
    setCalendarType(editingBookmarkCalendarType);
    setYear(editingBookmarkYear);
    setMonth(editingBookmarkMonth);
    setDay(nextDay);
    setSelectedBookmarkId(bookmark.id);
    setBookmarkTitle(nextTitle);
    setBookmarkDescription(nextDescription);
    setBookmarkHour(normalizeBookmarkTimePart(editingBookmarkHour, 23));
    setBookmarkMinute(normalizeBookmarkTimePart(editingBookmarkMinute, 59));
    setBookmarkSecond(normalizeBookmarkTimePart(editingBookmarkSecond, 59));
    setBookmarkTimeZone(editingBookmarkTimeZone || city.timeZone);
    setBookmarkEffect(normalizeBookmarkEffect(editingBookmarkEffect));
    setBookmarkEffectPalette(normalizeBookmarkEffectPalette(editingBookmarkEffectPalette));
    setBookmarkShowDescriptionInTimer(Boolean(editingBookmarkShowDescriptionInTimer));
    setEditingBookmarkId('');
  };

  const updateBookmarkDate = (bookmark) => {
    const nextBookmark = buildCurrentBookmark(
      bookmark.id,
      editingBookmarkTitle || bookmark.title,
      editingBookmarkDescription,
      bookmark.createdAt,
      editingBookmarkShowDescriptionInTimer,
    );

    setDateBookmarks((bookmarks) => bookmarks.map((item) => (item.id === bookmark.id ? nextBookmark : item)));
    setSelectedBookmarkId(bookmark.id);
    syncBookmarkFormState(nextBookmark);
    setEditingBookmarkId('');
    setActiveBookmarkActionsId('');
    setConfirmingDeleteId('');
  };

  const removeBookmark = (bookmarkId) => {
    setDateBookmarks((bookmarks) => bookmarks.filter((bookmark) => bookmark.id !== bookmarkId));
    if (selectedBookmarkId === bookmarkId) setSelectedBookmarkId('');
    if (editingBookmarkId === bookmarkId) setEditingBookmarkId('');
    if (activeBookmarkActionsId === bookmarkId) setActiveBookmarkActionsId('');
    if (confirmingDeleteId === bookmarkId) setConfirmingDeleteId('');
  };

  const toggleBookmarkActions = (bookmarkId) => {
    setActiveBookmarkActionsId((currentId) => (currentId === bookmarkId ? '' : bookmarkId));
    setEditingBookmarkId('');
    setConfirmingDeleteId('');
  };

  return h(
    'div',
    { className: 'age-bookmark-stack' },
    h(
      'section',
      { className: 'age-converter-card', 'aria-label': t.age_converter_title },
      h('div', { className: 'age-converter-card__header' },
        h('strong', null, t.age_converter_title),
        h('label', { className: 'age-converter-card__mode' },
          h('select', {
            value: calculatorMode,
            'aria-label': t.calculator_mode,
            onMouseDown: handleFocusIn,
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
            onChange: (event) => {
              resetBookmarkSelection();
              setCalculatorMode(event.target.value);
            },
          },
          h('option', { value: 'convert' }, t.date_conversion),
          h('option', { value: 'difference' }, t.date_difference),
          h('option', { value: 'offset' }, t.date_offset),
          ),
        ),
      ),
      calculatorMode === 'convert'
        ? [
      h('div', { className: 'age-converter-card__controls' },
        h('label', null, t.calendar_type,
          h('select', { value: calendarType, onMouseDown: handleFocusIn, onFocus: handleFocusIn, onBlur: handleFocusOut, onChange: (event) => resetConverterDateForCalendar(event.target.value) },
            h('option', { value: 'persian' }, t.solar_hijri),
            h('option', { value: 'gregorian' }, t.gregorian),
          ),
        ),
        h('label', null, t.year,
          h('select', { value: year, onMouseDown: handleFocusIn, onFocus: handleFocusIn, onBlur: handleFocusOut, onChange: (event) => { resetBookmarkSelection(); setYear(Number(event.target.value)); } },
            yearOptions.map((optionYear) => h('option', { key: optionYear, value: optionYear }, optionYear)),
          ),
        ),
        h('label', null, t.month,
          h('select', { value: month, onMouseDown: handleFocusIn, onFocus: handleFocusIn, onBlur: handleFocusOut, onChange: (event) => { resetBookmarkSelection(); setMonth(Number(event.target.value)); } },
            monthOptions.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
          ),
        ),
        h('label', null, t.day,
          h('select', { value: day, onMouseDown: handleFocusIn, onFocus: handleFocusIn, onBlur: handleFocusOut, onChange: (event) => { resetBookmarkSelection(); setDay(Number(event.target.value)); } },
            dayOptions.map((optionDay) => h('option', { key: optionDay, value: optionDay }, optionDay)),
          ),
        ),
      ),
      h('div', { className: 'age-converter-card__result' },
        h(SplitPill, { label: t.dates, items: [
          { label: t.gregorian, value: `${gregorianParts.year}/${formatNumber(gregorianParts.month)}/${formatNumber(gregorianParts.day)}` },
          { label: t.solar_hijri, value: `${persianParts.year}/${formatNumber(persianParts.month)}/${formatNumber(persianParts.day)}` },
        ] }),
        h(InfoPill, { label: timeDistanceTitle, value: timeDistanceLabel }),
        h(SplitPill, { label: t.converted_weekday, items: [
          { label: t.weekday, value: weekdayLabel },
          { label: t.leap_year, value: leapYearLabel },
        ] }),
        h(SplitPill, { label: t.solar_zodiac_details, className: 'split-pill--month-info', items: [
          { label: t.gregorian_month, value: gregorianMonthName },
          { label: t.solar_month, value: solarZodiacDetails.month },
          { label: t.persian_zodiac_name, value: solarZodiacDetails.sign },
          { label: t.western_zodiac, value: solarZodiacDetails.western },
        ] }),
        h(SplitPill, { label: t.animal_years, items: [
          { label: t.iranian_year_animal, value: iranianYearAnimal },
          { label: t.chinese_zodiac, value: chineseZodiac },
        ] }),
      ),
        ]
        : calculatorMode === 'difference'
          ? h('div', { className: 'date-difference-panel' },
          h('div', { className: 'date-difference-panel__dates' },
            h(DateFieldSet, { title: t.start_date, value: differenceStartDate, onChange: setDifferenceStartDate, t, onFocus: handleFocusIn, onBlur: handleFocusOut }),
            h(DateFieldSet, { title: t.end_date, value: differenceEndDate, onChange: setDifferenceEndDate, t, onFocus: handleFocusIn, onBlur: handleFocusOut }),
          ),
          h('div', { className: 'date-difference-panel__result' },
            h(InfoPill, { label: t.total_days, value: `${formatLocaleNumber(differenceTotalDays, language)} ${t.days}` }),
            h(InfoPill, { label: t.total_weeks, value: `${formatLocaleNumber(differenceTotalWeeks, language)} ${t.weeks_unit}` }),
            h(InfoPill, { label: t.total_months, value: `${formatLocaleNumber(differenceTotalMonths, language)} ${t.months_unit}` }),
            h(InfoPill, { label: t.difference_result, value: differenceDistanceLabel }),
          ),
          )
          : h('div', { className: 'date-offset-panel' },
            h('div', { className: 'date-offset-panel__controls' },
              h('label', null, t.date_origin,
                h('select', {
                  value: offsetOrigin,
                  onMouseDown: handleFocusIn,
                  onFocus: handleFocusIn,
                  onBlur: handleFocusOut,
                  onChange: (event) => setOffsetOrigin(event.target.value),
                },
                h('option', { value: 'today' }, t.current_date),
                h('option', { value: 'custom' }, t.custom_date),
                ),
              ),
              h('label', null, t.direction,
                h('select', {
                  value: offsetDirection,
                  onMouseDown: handleFocusIn,
                  onFocus: handleFocusIn,
                  onBlur: handleFocusOut,
                  onChange: (event) => setOffsetDirection(event.target.value),
                },
                h('option', { value: 'after' }, t.after),
                h('option', { value: 'before' }, t.before),
                ),
              ),
              h('label', null, t.number_of_days,
                h('input', {
                  type: 'number',
                  min: 0,
                  max: 100000,
                  inputMode: 'numeric',
                  value: offsetDays,
                  onFocus: handleFocusIn,
                  onBlur: handleFocusOut,
                  onChange: (event) => setOffsetDays(event.target.value),
                }),
              ),
            ),
            offsetOrigin === 'custom' && h(DateFieldSet, {
              title: t.base_date,
              value: offsetBaseDate,
              onChange: setOffsetBaseDate,
              t,
              onFocus: handleFocusIn,
              onBlur: handleFocusOut,
            }),
            h('div', { className: 'date-offset-panel__result' },
              h(SplitPill, { label: t.result_date, items: [
                { label: t.gregorian, value: `${offsetResultGregorian.year}/${formatNumber(offsetResultGregorian.month)}/${formatNumber(offsetResultGregorian.day)}` },
                { label: t.solar_hijri, value: `${offsetResultPersian.year}/${formatNumber(offsetResultPersian.month)}/${formatNumber(offsetResultPersian.day)}` },
              ] }),
              h(InfoPill, { label: t.weekday, value: offsetResultWeekday }),
              h(InfoPill, { label: t.calculation_summary, value: offsetSummary }),
            ),
          ),
    ),
    h(
      'section',
      { className: 'date-bookmarks-card', 'aria-label': t.date_bookmarks },
      h('div', { className: 'date-bookmarks-card__header' },
        h('strong', null, t.date_bookmarks),
        selectedBookmark && h('small', null, `${t.selected}: ${selectedBookmark.title}`),
      ),
    selectedBookmarkTimer && h(
      'div',
      {
        className: `selected-bookmark-timer fullscreen-background--${fullscreenBackground === 'dark' ? 'dark' : 'light'}${isBookmarkTimerFullscreen ? ' app-viewport-fullscreen' : ''}${bookmarkFullscreenControlsVisible ? ' fullscreen-controls-visible' : ''}`,
        'aria-live': 'polite',
      },
      isBookmarkTimerFullscreen && h('div', { className: `selected-bookmark-timer__top-controls${isBookmarkTimerFallbackFullscreen ? ' app-viewport-fullscreen-controls' : ''}${bookmarkFullscreenControlsVisible ? ' fullscreen-controls-visible' : ''}` },
        h(
          'button',
          { type: 'button', className: 'fullscreen-background-button', onClick: onFullscreenBackgroundToggle },
          fullscreenBackground === 'dark' ? t.light_background : t.dark_background,
        ),
        selectedBookmark && getBookmarkEffectType(selectedBookmark) !== 'none' && h(
          'button',
          { type: 'button', className: 'selected-bookmark-timer__effect-button', onClick: runSelectedBookmarkEffect },
          t.run_bookmark_effect,
        ),
        h('button', { type: 'button', className: 'selected-bookmark-timer__focus', onClick: toggleBookmarkTimerFullscreen },
          t.exit_fullscreen,
        ),
      ),
      h('div', { className: 'selected-bookmark-timer__header' },
        h('div', { className: 'selected-bookmark-timer__headline', key: `headline-${selectedBookmark?.id || 'empty'}` },
          h('strong', null, selectedBookmarkTimerTitle),
          h('small', {
            className: 'selected-bookmark-timer__description',
            hidden: !selectedBookmarkTimerDescription,
          }, selectedBookmarkTimerDescription),
        ),
        !isBookmarkTimerFullscreen && h('div', { className: 'selected-bookmark-timer__actions' },
          h('button', { type: 'button', className: 'selected-bookmark-timer__focus', onClick: toggleBookmarkTimerFullscreen },
            t.fullscreen,
          ),
        ),
      ),
      h('div', { className: 'selected-bookmark-timer__grid' },
        [
          [t.year, selectedBookmarkTimer.years],
          [t.month, selectedBookmarkTimer.months],
          [t.day, selectedBookmarkTimer.days],
          [t.hour, selectedBookmarkTimer.hours],
          [t.minute, selectedBookmarkTimer.minutes],
          [t.second, selectedBookmarkTimer.seconds],
        ].map(([label, value]) => h(
          'article',
          { className: 'selected-bookmark-timer__unit', key: label },
          h('strong', null, formatLocaleNumber(value, language)),
          h('span', null, label),
        )),
      ),
      activeBookmarkEffect && h(BookmarkEffectOverlay, { effect: activeBookmarkEffect.id, palette: activeBookmarkEffect.palette, key: activeBookmarkEffect.key }),
    ),
    h(
      'div',
      { className: 'date-bookmark-form' },
      h('label', null, t.bookmark_title,
        h('input', {
          value: bookmarkTitle,
          onInput: (event) => setBookmarkTitle(event.target.value),
          onChange: (event) => setBookmarkTitle(event.target.value),
          onFocus: handleFocusIn,
          onBlur: handleFocusOut,
          placeholder: getBookmarkTitle(),
        }),
      ),
      h('label', null, t.bookmark_description,
        h('textarea', {
          value: bookmarkDescription,
          onInput: (event) => setBookmarkDescription(event.target.value),
          onChange: (event) => setBookmarkDescription(event.target.value),
          onFocus: handleFocusIn,
          onBlur: handleFocusOut,
          rows: 2,
          placeholder: t.bookmark_description_placeholder,
        }),
      ),
      h('div', { className: 'date-bookmark__effect-pair' },
        h('label', null, t.bookmark_effect,
          h('select', {
            value: bookmarkEffect,
            onInput: (event) => setBookmarkEffect(normalizeBookmarkEffect(event.target.value)),
            onChange: (event) => setBookmarkEffect(normalizeBookmarkEffect(event.target.value)),
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
          },
          bookmarkEffectOptions.map((option) => h('option', { key: option.id, value: option.id }, option.label)),
          ),
        ),
        h('label', null, t.bookmark_effect_palette,
          h('select', {
            value: bookmarkEffectPalette,
            disabled: bookmarkEffect === 'none',
            onInput: (event) => setBookmarkEffectPalette(normalizeBookmarkEffectPalette(event.target.value)),
            onChange: (event) => setBookmarkEffectPalette(normalizeBookmarkEffectPalette(event.target.value)),
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
          },
          bookmarkEffectPaletteOptions.map((option) => h('option', { key: option.id, value: option.id }, option.label)),
          ),
        ),
      ),
      h('div', { className: 'date-bookmark__time-fields' },
        h('label', null, t.bookmark_timezone,
          h('select', {
            value: bookmarkTimeZone,
            onInput: (event) => setBookmarkTimeZone(event.target.value),
            onChange: (event) => setBookmarkTimeZone(event.target.value),
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
          },
          bookmarkTimeZoneOptions.map((option) => h('option', { key: option.timeZone, value: option.timeZone }, getTimeZoneOptionLabel(option))),
          ),
        ),
        h('label', null, t.hour,
          h('select', {
            value: bookmarkHour,
            onInput: (event) => setBookmarkHour(normalizeBookmarkTimePart(event.target.value, 23)),
            onChange: (event) => setBookmarkHour(normalizeBookmarkTimePart(event.target.value, 23)),
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
          },
          hourOptions.map((option) => h('option', { key: option, value: option }, formatNumber(option))),
          ),
        ),
        h('label', null, t.minute,
          h('select', {
            value: bookmarkMinute,
            onInput: (event) => setBookmarkMinute(normalizeBookmarkTimePart(event.target.value, 59)),
            onChange: (event) => setBookmarkMinute(normalizeBookmarkTimePart(event.target.value, 59)),
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
          },
          minuteSecondOptions.map((option) => h('option', { key: option, value: option }, formatNumber(option))),
          ),
        ),
        h('label', null, t.second,
          h('select', {
            value: bookmarkSecond,
            onInput: (event) => setBookmarkSecond(normalizeBookmarkTimePart(event.target.value, 59)),
            onChange: (event) => setBookmarkSecond(normalizeBookmarkTimePart(event.target.value, 59)),
            onFocus: handleFocusIn,
            onBlur: handleFocusOut,
          },
          minuteSecondOptions.map((option) => h('option', { key: option, value: option }, formatNumber(option))),
          ),
        ),
      ),
      h('label', { className: 'date-bookmark__checkbox' },
        h('input', {
          type: 'checkbox',
          checked: bookmarkShowDescriptionInTimer,
          onChange: (event) => setBookmarkShowDescriptionInTimer(event.target.checked),
          onFocus: handleFocusIn,
          onBlur: handleFocusOut,
        }),
        h('span', null, t.bookmark_show_description_in_timer),
      ),
      h('button', { type: 'button', className: 'date-bookmark-save', onClick: saveCurrentBookmark }, selectedBookmark ? t.update_bookmark : t.bookmark_date),
    ),
    h(
      'div',
      { className: 'date-bookmarks', 'aria-label': t.date_bookmarks },
      dateBookmarks.length
        ? h(
          'div',
          { className: 'date-bookmarks__list' },
          dateBookmarks.map((bookmark) => {
            const bookmarkDate = new Date(`${bookmark.dateKey}T12:00:00Z`);
            const bookmarkGregorian = getCalendarPartsFromUtc(bookmarkDate, 'gregorian');
            const bookmarkPersian = getPersianDatePartsFromUtc(bookmarkDate);
            const isEditing = editingBookmarkId === bookmark.id;
            const isActionsOpen = activeBookmarkActionsId === bookmark.id;
            const isConfirmingDelete = confirmingDeleteId === bookmark.id;
            const editingMonthOptions = editingBookmarkCalendarType === 'gregorian' ? getCalendarMonthOptions('gregorian') : getCalendarMonthOptions('persian');
            const editingYearOptions = editingBookmarkCalendarType === 'gregorian'
              ? Array.from({ length: 2400 - 1900 + 1 }, (_, index) => 1900 + index)
              : Array.from({ length: 1700 - 1250 + 1 }, (_, index) => 1250 + index);
            const editingDaysInMonth = editingBookmarkCalendarType === 'gregorian'
              ? getDaysInGregorianMonth(editingBookmarkYear, editingBookmarkMonth)
              : getDaysInPersianMonth(editingBookmarkYear, editingBookmarkMonth);
            const editingDayOptions = Array.from({ length: editingDaysInMonth }, (_, index) => index + 1);
            const editingSafeDay = Math.min(editingBookmarkDay, editingDaysInMonth);
            const editingPreviewDate = isEditing
              ? getBookmarkDateFromFields(editingBookmarkCalendarType, editingBookmarkYear, editingBookmarkMonth, editingSafeDay)
              : bookmarkDate;
            const bookmarkDescriptionText = getBookmarkDescriptionValue(bookmark);
            const editingPreviewGregorian = getCalendarPartsFromUtc(editingPreviewDate, 'gregorian');
            const editingPreviewPersian = getPersianDatePartsFromUtc(editingPreviewDate);
            const updateEditingCalendarType = (nextCalendarType) => {
              const nextYear = nextCalendarType === 'gregorian' ? editingPreviewGregorian.year : editingPreviewPersian.year;
              const nextMonth = nextCalendarType === 'gregorian' ? editingPreviewGregorian.month : editingPreviewPersian.month;
              const nextDay = nextCalendarType === 'gregorian' ? editingPreviewGregorian.day : editingPreviewPersian.day;

              setEditingBookmarkCalendarType(nextCalendarType);
              setEditingBookmarkYear(nextYear);
              setEditingBookmarkMonth(nextMonth);
              setEditingBookmarkDay(nextDay);
            };

            return h(
              'article',
              { className: `date-bookmark${selectedBookmarkId === bookmark.id ? ' selected' : ''}`, key: bookmark.id },
              h('button', { type: 'button', className: 'date-bookmark__main', onClick: () => selectBookmark(bookmark) },
                h('strong', null, bookmark.title),
                h('span', null, `${t.gregorian} ${bookmarkGregorian.year}/${formatNumber(bookmarkGregorian.month)}/${formatNumber(bookmarkGregorian.day)} · ${t.solar_hijri} ${bookmarkPersian.year}/${formatNumber(bookmarkPersian.month)}/${formatNumber(bookmarkPersian.day)}`),
                h('small', { hidden: !bookmarkDescriptionText }, bookmarkDescriptionText),
              ),
              isEditing && h('input', {
                className: 'date-bookmark__title-input',
                value: editingBookmarkTitle,
                onInput: (event) => setEditingBookmarkTitle(event.target.value),
                onChange: (event) => setEditingBookmarkTitle(event.target.value),
                onFocus: handleFocusIn,
                onBlur: handleFocusOut,
                'aria-label': t.bookmark_title,
              }),
              isEditing && h('textarea', {
                className: 'date-bookmark__description-input',
                value: editingBookmarkDescription,
                onInput: (event) => setEditingBookmarkDescription(event.target.value),
                onChange: (event) => setEditingBookmarkDescription(event.target.value),
                onFocus: handleFocusIn,
                onBlur: handleFocusOut,
                rows: 2,
                'aria-label': t.bookmark_description,
              }),
              isEditing && h('div', { className: 'date-bookmark__effect-pair date-bookmark__edit-effect-pair' },
                h('label', { className: 'date-bookmark__effect-input' },
                  h('span', null, t.bookmark_effect),
                  h('select', {
                    value: editingBookmarkEffect,
                    onFocus: handleFocusIn,
                    onBlur: handleFocusOut,
                    onChange: (event) => setEditingBookmarkEffect(normalizeBookmarkEffect(event.target.value)),
                  },
                  bookmarkEffectOptions.map((option) => h('option', { key: option.id, value: option.id }, option.label)),
                  ),
                ),
                h('label', { className: 'date-bookmark__effect-input' },
                  h('span', null, t.bookmark_effect_palette),
                  h('select', {
                    value: editingBookmarkEffectPalette,
                    disabled: editingBookmarkEffect === 'none',
                    onFocus: handleFocusIn,
                    onBlur: handleFocusOut,
                    onChange: (event) => setEditingBookmarkEffectPalette(normalizeBookmarkEffectPalette(event.target.value)),
                  },
                  bookmarkEffectPaletteOptions.map((option) => h('option', { key: option.id, value: option.id }, option.label)),
                  ),
                ),
              ),
              isEditing && h('div', { className: 'date-bookmark__time-fields date-bookmark__edit-time-fields' },
                h('label', null, t.bookmark_timezone,
                  h('select', {
                    value: editingBookmarkTimeZone,
                    onFocus: handleFocusIn,
                    onBlur: handleFocusOut,
                    onChange: (event) => setEditingBookmarkTimeZone(event.target.value),
                  },
                  bookmarkTimeZoneOptions.map((option) => h('option', { key: option.timeZone, value: option.timeZone }, getTimeZoneOptionLabel(option))),
                  ),
                ),
                h('label', null, t.hour,
                  h('select', {
                    value: editingBookmarkHour,
                    onFocus: handleFocusIn,
                    onBlur: handleFocusOut,
                    onChange: (event) => setEditingBookmarkHour(normalizeBookmarkTimePart(event.target.value, 23)),
                  },
                  hourOptions.map((option) => h('option', { key: option, value: option }, formatNumber(option))),
                  ),
                ),
                h('label', null, t.minute,
                  h('select', {
                    value: editingBookmarkMinute,
                    onFocus: handleFocusIn,
                    onBlur: handleFocusOut,
                    onChange: (event) => setEditingBookmarkMinute(normalizeBookmarkTimePart(event.target.value, 59)),
                  },
                  minuteSecondOptions.map((option) => h('option', { key: option, value: option }, formatNumber(option))),
                  ),
                ),
                h('label', null, t.second,
                  h('select', {
                    value: editingBookmarkSecond,
                    onFocus: handleFocusIn,
                    onBlur: handleFocusOut,
                    onChange: (event) => setEditingBookmarkSecond(normalizeBookmarkTimePart(event.target.value, 59)),
                  },
                  minuteSecondOptions.map((option) => h('option', { key: option, value: option }, formatNumber(option))),
                  ),
                ),
              ),
              isEditing && h('label', { className: 'date-bookmark__checkbox date-bookmark__edit-checkbox' },
                h('input', {
                  type: 'checkbox',
                  checked: editingBookmarkShowDescriptionInTimer,
                  onFocus: handleFocusIn,
                  onBlur: handleFocusOut,
                  onChange: (event) => setEditingBookmarkShowDescriptionInTimer(event.target.checked),
                }),
                h('span', null, t.bookmark_show_description_in_timer),
              ),
              isEditing && h(
                'div',
                { className: 'date-bookmark__edit-date-panel' },
                h('div', { className: 'date-bookmark__edit-date-header' },
                  h('strong', null, t.edit_bookmark_date),
                  h('span', null, `${t.selected_date}: ${t.gregorian} ${editingPreviewGregorian.year}/${formatNumber(editingPreviewGregorian.month)}/${formatNumber(editingPreviewGregorian.day)} · ${t.solar_hijri} ${editingPreviewPersian.year}/${formatNumber(editingPreviewPersian.month)}/${formatNumber(editingPreviewPersian.day)}`),
                ),
                h('div', { className: 'date-bookmark__calendar-tabs', role: 'group', 'aria-label': t.calendar_type },
                  [
                    { id: 'persian', label: t.solar_hijri },
                    { id: 'gregorian', label: t.gregorian },
                  ].map((option) => h(
                    'button',
                    {
                      type: 'button',
                      className: editingBookmarkCalendarType === option.id ? 'selected' : '',
                      onClick: () => updateEditingCalendarType(option.id),
                      'aria-pressed': editingBookmarkCalendarType === option.id,
                      key: option.id,
                    },
                    option.label,
                  )),
                ),
                h('div', { className: 'date-bookmark__edit-date-fields' },
                  h('label', null,
                    h('span', null, t.year),
                    h('select', {
                      value: editingBookmarkYear,
                      onFocus: handleFocusIn,
                      onBlur: handleFocusOut,
                      onChange: (event) => {
                        const nextYear = Number(event.target.value);
                        const nextDaysInMonth = editingBookmarkCalendarType === 'gregorian'
                          ? getDaysInGregorianMonth(nextYear, editingBookmarkMonth)
                          : getDaysInPersianMonth(nextYear, editingBookmarkMonth);

                        setEditingBookmarkYear(nextYear);
                        setEditingBookmarkDay((currentDay) => Math.min(currentDay, nextDaysInMonth));
                      },
                    },
                    editingYearOptions.map((optionYear) => h('option', { key: optionYear, value: optionYear }, optionYear)),
                    ),
                  ),
                  h('label', null,
                    h('span', null, t.month),
                    h('select', {
                      value: editingBookmarkMonth,
                      onFocus: handleFocusIn,
                      onBlur: handleFocusOut,
                      onChange: (event) => {
                        const nextMonth = Number(event.target.value);
                        const nextDaysInMonth = editingBookmarkCalendarType === 'gregorian'
                          ? getDaysInGregorianMonth(editingBookmarkYear, nextMonth)
                          : getDaysInPersianMonth(editingBookmarkYear, nextMonth);

                        setEditingBookmarkMonth(nextMonth);
                        setEditingBookmarkDay((currentDay) => Math.min(currentDay, nextDaysInMonth));
                      },
                    },
                    editingMonthOptions.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
                    ),
                  ),
                  h('label', null,
                    h('span', null, t.day),
                    h('select', {
                      value: editingSafeDay,
                      onFocus: handleFocusIn,
                      onBlur: handleFocusOut,
                      onChange: (event) => setEditingBookmarkDay(Number(event.target.value)),
                    },
                    editingDayOptions.map((optionDay) => h('option', { key: optionDay, value: optionDay }, optionDay)),
                    ),
                  ),
                ),
              ),
              h('div', { className: 'date-bookmark__actions' },
                isEditing
                  ? [
                    h('button', { key: 'save-title', type: 'button', onClick: () => saveBookmarkDetails(bookmark) }, t.done),
                    h('button', { key: 'cancel-edit', type: 'button', onClick: () => setEditingBookmarkId('') }, t.cancel),
                  ]
                  : [
                    h('button', { key: 'manage', type: 'button', className: 'date-bookmark__manage', onClick: () => toggleBookmarkActions(bookmark.id), 'aria-expanded': String(isActionsOpen) }, t.manage_bookmark),
                    isActionsOpen && h('button', { key: 'edit', type: 'button', onClick: () => startEditingBookmark(bookmark) }, t.edit),
                    isActionsOpen && h('button', { key: 'delete', type: 'button', className: 'date-bookmark__delete', onClick: () => setConfirmingDeleteId(bookmark.id) }, t.remove),
                  ],
              ),
              isActionsOpen && isConfirmingDelete && h(
                'div',
                { className: 'date-bookmark__confirm' },
                h('span', null, t.confirm_delete_bookmark),
                h('button', { type: 'button', className: 'date-bookmark__delete', onClick: () => removeBookmark(bookmark.id) }, t.confirm_delete),
                h('button', { type: 'button', onClick: () => setConfirmingDeleteId('') }, t.cancel),
              ),
            );
          }),
        )
        : h('p', { className: 'date-bookmarks__empty' }, t.no_date_bookmarks),
    ),
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
          [h('span', { className: 'timezone-row__name', key: 'name' }, city.label), h('span', { className: 'timezone-row__phase', key: 'phase' }, city.timeOfDayLabel)],
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
    { className: `day-night-card day-night-card--${city.timeOfDay}${timeline.isDaylight ? ' day-night-card--is-day' : ' day-night-card--is-night'}`, 'aria-label': `Day and night in ${city.label}` },
    h(
      'div',
      { className: 'day-night-card__header' },
      h(
        'div',
        { className: 'day-night-card__event' },
        h('span', { className: 'day-night-card__icon', 'aria-hidden': 'true' }, timeline.isDaylight ? '☀️' : timeline.isTwilight ? '🌅' : '🌙'),
        h('div', { className: 'day-night-card__event-copy' }, h('span', null, localizedEventLabel), h('strong', null, timeline.eventTime)),
      ),
      h('p', { className: 'day-night-card__remaining' }, `${localizedStatus}: ${timeline.remaining}${timeline.isEstimated ? ` · ${t.estimated}` : ''}`),
    ),
    h(
      'div',
      { className: 'sun-chart' },
      h(
        'svg',
        { viewBox: '0 0 1000 300', role: 'img', 'aria-label': 'Twenty-four hour day and night curve' },
        h('defs', null,
          h('linearGradient', { id: 'daySkyGradient', x1: '0', x2: '0', y1: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: 'var(--sun-chart-sky-top, #79b8f3)', stopOpacity: '0.92' }),
            h('stop', { offset: '100%', stopColor: 'var(--sun-chart-sky-bottom, #0f4f86)', stopOpacity: '0.92' }),
          ),
          h('filter', { id: 'sunGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' },
            h('feGaussianBlur', { stdDeviation: '12', result: 'blur' }),
            h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })),
          ),
        ),
        h('rect', { x: '0', y: '0', width: '1000', height: '160', rx: '18', fill: 'url(#daySkyGradient)' }),
        h('rect', { x: '0', y: '160', width: '1000', height: '140', fill: 'var(--sun-chart-night, #15161a)' }),
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


function MonthlyCalendarCard({ city, t, language, initialOccasionTypes, visibleOccasionTypes = null, occasionFilterOrder = null }) {
  const todayKey = getCalendarDateKey(city.cityDate);
  const [primaryCalendar, setPrimaryCalendar] = useState('persian');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const fallbackOccasionTypes = ['iran', 'iranCurrent', 'iranAncient', 'international', 'globalOfficial', 'marketing', 'islamic', 'islamicShia', 'islamicSunni', 'islamicShared'];
  const [enabledOccasionTypes, setEnabledOccasionTypes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(savedOccasionFiltersKey) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return initialOccasionTypes || globalThis.__defaultOccasionTypes || fallbackOccasionTypes;
  });
  const allowedOccasionTypes = (visibleOccasionTypes&&visibleOccasionTypes.length)?visibleOccasionTypes:fallbackOccasionTypes;
  let calendar = null;


  useEffect(() => {
    let hasSaved = false;
    try {
      const saved = JSON.parse(localStorage.getItem(savedOccasionFiltersKey) || 'null');
      hasSaved = Array.isArray(saved) && saved.length > 0;
    } catch {}
    if (!hasSaved && Array.isArray(initialOccasionTypes) && initialOccasionTypes.length) {
      setEnabledOccasionTypes(initialOccasionTypes);
    }
  }, [initialOccasionTypes]);

  useEffect(() => {
    localStorage.setItem(savedOccasionFiltersKey, JSON.stringify(enabledOccasionTypes));
  }, [enabledOccasionTypes]);
  const allOccasionTypeOptions = [
    { id: 'iran', label: t.calendar_iran },
    { id: 'iranCurrent', label: t.calendar_iran_current },
    { id: 'iranAncient', label: t.calendar_iran_ancient },
    { id: 'international', label: t.calendar_international },
    { id: 'globalOfficial', label: t.calendar_global_official },
    { id: 'marketing', label: t.calendar_marketing },
    { id: 'islamic', label: t.calendar_islamic },
    { id: 'islamicShia', label: t.calendar_islamic_shia },
    { id: 'islamicSunni', label: t.calendar_islamic_sunni },
    { id: 'islamicShared', label: t.calendar_islamic_shared },
  ];

  const toggleOccasionType = (type) => {
    setEnabledOccasionTypes((active) => {
      if (active.includes(type)) {
        return active.filter((item) => item !== type);
      }

      return [...active, type];
    });
  };

  try {
    calendar = getSyncedMonthCalendar(city.cityDate, primaryCalendar, monthOffset, selectedDateKey, t, language, enabledOccasionTypes.filter((type)=>allowedOccasionTypes.includes(type)));
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

  const selectedOccasionGroup = getSelectedOccasionGroup(calendar);
  const occasionTypeOrder = (Array.isArray(occasionFilterOrder) && occasionFilterOrder.length ? occasionFilterOrder : ['iran', 'iranCurrent', 'iranAncient', 'international', 'globalOfficial', 'marketing', 'islamic', 'islamicShia', 'islamicSunni', 'islamicShared']).filter((type)=>fallbackOccasionTypes.includes(type));
  const groupOccasionsByType = (events) => occasionTypeOrder.filter((type)=>allowedOccasionTypes.includes(type))
    .map((type) => {
      const typeEvents = events.filter((event) => event.type === type);
      return typeEvents.length > 0
        ? { type, calendarLabel: typeEvents[0].calendar, events: typeEvents }
        : null;
    })
    .filter(Boolean);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const list = document.querySelector('.monthly-occasions__list');
      const selectedItem = list?.querySelector('.monthly-occasions__day--selected');
      if (!list || !selectedItem) return;

      list.scrollTop = Math.max(0, selectedItem.offsetTop - (list.clientHeight / 2) + (selectedItem.clientHeight / 2));
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedDateKey, primaryCalendar, monthOffset, enabledOccasionTypes]);

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
        h('span', { className: 'monthly-calendar__eyebrow' }, calendar.eyebrow),
        h('strong', { className: 'monthly-calendar__month-title' }, calendar.title),
        h(
          'div',
          { className: 'monthly-calendar__mode', 'aria-label': t.choose_primary_calendar },
          [
            { id: 'persian', label: t.solar_hijri, shortLabel: t.solar_hijri },
            { id: 'gregorian', label: t.gregorian, shortLabel: t.gregorian },
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
            className: `monthly-calendar__day monthly-calendar__day--overlay${day.visibleEvents.length ? ' monthly-calendar__day--has-events' : ''}${day.isPartialHoliday ? ' monthly-calendar__day--partial-holiday' : ''}${day.isHoliday ? ' monthly-calendar__day--holiday' : ''}${day.isOutsideMonth ? ' monthly-calendar__day--outside' : ''}${day.isToday ? ' monthly-calendar__day--today' : ''}${day.isSelected ? ' monthly-calendar__day--selected' : ''}`,
            onClick: () => selectDay(day.dateKey),
            'aria-pressed': day.isSelected,
            title: day.officialHolidays?.length
              ? day.officialHolidays.map((holiday) => language === 'fa' ? (holiday.title_fa || holiday.title_en || '') : (holiday.title_en || holiday.title_fa || '')).filter(Boolean).join('، ')
              : undefined,
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
      h('div', { className: 'monthly-calendar__meta' },
        h('small', null, `${t.selected}: ${calendar.selectedLabel}`),
      ),
    ),
    h(
      'aside',
      { className: 'monthly-occasions', 'aria-label': `${calendar.title} occasions` },
      h(
        'header',
        null,
        h(
          'div',
          { className: 'monthly-occasions__top' },
          h('span', null, t.month_occasions),
          h(
            'details',
            { className: 'monthly-occasions__filters' },
            h('summary', null, t.filter_occasions),
            h(
              'div',
              { className: 'monthly-occasions__filters-menu' },
              occasionTypeOrder.filter((typeId)=>allowedOccasionTypes.includes(typeId)).map((typeId)=>allOccasionTypeOptions.find((o)=>o.id===typeId)).filter(Boolean).map((option) => h(
                'label',
                { key: option.id },
                h('input', { type: 'checkbox', checked: enabledOccasionTypes.includes(option.id), onChange: () => toggleOccasionType(option.id) }),
                h('span', null, option.label),
              )),
            ),
          ),
        ),
        h('strong', null, calendar.title),
        h(
          'div',
          { className: 'monthly-occasions__meta' },
          h('small', null, `${t.occasions_summary} · ${calendar.occasions.length} ${t.days}`),
        ),
      ),
      calendar.occasions.length > 0
        ? h(
          'div',
          { className: 'monthly-occasions__list' },
          calendar.occasions.map((group) => h(
            'article',
            { className: `monthly-occasions__day${group.isSelected ? ' monthly-occasions__day--selected' : ''}`, key: group.id, onClick: () => selectDay(group.dateKey), role: 'button', tabIndex: 0, onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectDay(group.dateKey); } } },
            h(
              'div',
              { className: 'monthly-occasions__date' },
              h('strong', null, group.primaryDate.day),
              h('small', null, `${group.secondaryDate.month}/${formatNumber(group.secondaryDate.day)}`),
            ),
            h(
              'ul',
              null,
              groupOccasionsByType(group.events).map((typeGroup, index, groupedTypes) => h(
                'li',
                { key: `${group.id}-${typeGroup.type}` },
                h(
                  'div',
                  { className: 'monthly-occasions__type' },
                  h('span', null, typeGroup.calendarLabel),
                  h(
                    'div',
                    { className: 'monthly-occasions__titles' },
                    typeGroup.events.map((event) => h('strong', { key: `${group.id}-${typeGroup.type}-${event.title}` }, event.title)),
                  ),
                ),
                index < groupedTypes.length - 1 ? h('hr', { className: 'monthly-occasions__divider' }) : null,
              )),
            ),
          )),
        )
        : h('p', { className: 'monthly-occasions__empty' }, t.no_occasions),
    ),
    h(
      'section',
      { className: 'occasion-insights', 'aria-label': t.occasion_insights_title },
      h('h3', null, t.occasion_insights_title),
      selectedOccasionGroup && selectedOccasionGroup.events.length > 0
        ? h(
          'div',
          { className: 'occasion-insights__list' },
          selectedOccasionGroup.events.map((event) => {
            const insight = getOccasionInsight(event, language);

            return h(
              'article',
              { className: 'occasion-insights__item', key: `${selectedOccasionGroup.id}-${event.title}` },
              h('strong', null, event.title),
              h('p', null, insight.description),
              insight.sourceUrl
                ? h('a', { href: insight.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, insight.sourceLabel || insight.sourceUrl)
                : null,
            );
          }),
        )
        : h('p', { className: 'occasion-insights__empty' }, t.no_selected_occasion_description),
    ),
  );
}

function SplitPill({ label, items, wide = false, className = '' }) {
  return h(
    'article',
    { className: `info-pill split-pill${wide ? ' split-pill--wide' : ''}${items.length === 3 ? ' split-pill--three' : ''}${items.length > 3 ? ' split-pill--many' : ''}${className ? ` ${className}` : ''}` },
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
  const [isAgePickerActive, setIsAgePickerActive] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [activeCityIds, setActiveCityIds] = useState(getInitialCityIds);
  const [selectedCityId, setSelectedCityId] = useState(() => {
    const savedSelectedCityId = localStorage.getItem(savedSelectedCityKey);
    return savedSelectedCityId && activeCityIds.includes(savedSelectedCityId) ? savedSelectedCityId : (activeCityIds[0] || defaultCityIds[0]);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [ntpHost, setNtpHost] = useState(defaultNtpHost);
  const [ntpStatus, setNtpStatus] = useState({ kind: 'local', label: i18n.en.local_clock, detail: i18n.en.using_device_clock, host: ntpHost, delay: i18n.en.not_measured });
  const [isClockNativeFullscreen, setIsClockNativeFullscreen] = useState(false);
  const [isClockFallbackFullscreen, setIsClockFallbackFullscreen] = useState(false);
  const [clockFullscreenControlsVisible, setClockFullscreenControlsVisible] = useState(true);
  const [fullscreenBackground, setFullscreenBackground] = useState(getInitialFullscreenBackground);

  const [draggingCityId, setDraggingCityId] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [defaultOccasionTypes, setDefaultOccasionTypes] = useState(globalThis.__defaultOccasionTypes || null);
  const [visibleOccasionTypes, setVisibleOccasionTypes] = useState(globalThis.__visibleOccasionTypes || null);
  const [occasionFilterOrder, setOccasionFilterOrder] = useState(globalThis.__occasionFilterOrder || null);
  const isFa = language === 'fa';
  const isClockFullscreen = isClockNativeFullscreen || isClockFallbackFullscreen;

  useEffect(() => {
    const updateClock = () => {
      if (isAgePickerActive) return;
      setNow(new Date(Date.now() + timeOffset));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [timeOffset, isAgePickerActive]);

  useEffect(() => {
    localStorage.setItem(savedCitiesKey, JSON.stringify(activeCityIds));
  }, [activeCityIds]);

  useEffect(() => {
    localStorage.setItem(savedLanguageKey, language);
    document.documentElement.lang = language;
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
  }, [isFa, language]);

  useEffect(() => {
    if (selectedCityId) {
      localStorage.setItem(savedSelectedCityKey, selectedCityId);
    }
  }, [selectedCityId]);

  useEffect(() => {
    localStorage.setItem(savedFullscreenBackgroundKey, fullscreenBackground);
  }, [fullscreenBackground]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement?.classList?.contains('hero-panel'));
      setIsClockNativeFullscreen(isFullscreen);
      if (document.fullscreenElement) {
        setIsClockFallbackFullscreen(false);
      }
      setClockFullscreenControlsVisible(isFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useFallbackFullscreenMode(isClockFallbackFullscreen, () => setIsClockFallbackFullscreen(false));
  useFullscreenControlsAutoHide(isClockFullscreen, setClockFullscreenControlsVisible);

  const toggleClockFullscreen = () => {
    const clockElement = document.querySelector('.hero-panel');
    if (!clockElement) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    if (isClockFallbackFullscreen) {
      setIsClockFallbackFullscreen(false);
      return;
    }

    if (clockElement.requestFullscreen) {
      clockElement.requestFullscreen().catch(() => {
        setIsClockFallbackFullscreen(true);
        setClockFullscreenControlsVisible(true);
      });
      return;
    }

    setIsClockFallbackFullscreen(true);
    setClockFullscreenControlsVisible(true);
  };

  const toggleFullscreenBackground = () => {
    setFullscreenBackground((current) => (current === 'dark' ? 'daynight' : 'dark'));
  };

  useEffect(() => {
    let mounted = true;
    const loadPublicConfig = () => fetch('/api/public-config')
      .then((res) => {
        if (!res.ok) throw new Error('Public config API unavailable');
        return res.json();
      })
      .catch(() => fetch('/config.json').then((res) => {
        if (!res.ok) throw new Error('Static config unavailable');
        return res.json();
      }))
      .then((cfg) => {
        if (!mounted) return;
        if (cfg.ntpHost) {
          setNtpHost(cfg.ntpHost);
        }
        const userCustomizedCities = localStorage.getItem(userCitiesCustomizedKey) === '1';
        if (!userCustomizedCities && Array.isArray(cfg.defaultCityIds) && cfg.defaultCityIds.length) {
          const resolvedIds = cfg.defaultCityIds.map(resolveConfiguredCityId).filter(Boolean);
          if (resolvedIds.length) {
            setActiveCityIds(Array.from(new Set(resolvedIds)));
          }
        }
        const userCustomizedSelectedCity = localStorage.getItem(savedSelectedCityCustomizedKey) === '1';
        if (!userCustomizedSelectedCity && typeof cfg.defaultSelectedCityId === 'string') {
          const resolvedSelected = resolveConfiguredCityId(cfg.defaultSelectedCityId);
          if (resolvedSelected) {
            setSelectedCityId(resolvedSelected);
          }
        }
        globalThis.__defaultOccasionTypes = Array.isArray(cfg.defaultOccasionTypes) ? cfg.defaultOccasionTypes : undefined;
        globalThis.__visibleOccasionTypes = Array.isArray(cfg.visibleOccasionTypes) ? cfg.visibleOccasionTypes : undefined;
        globalThis.__occasionFilterOrder = Array.isArray(cfg.occasionFilterOrder) ? cfg.occasionFilterOrder : undefined;
        if (Array.isArray(cfg.visibleOccasionTypes) && cfg.visibleOccasionTypes.length) {
          setVisibleOccasionTypes(cfg.visibleOccasionTypes);
        }
        if (Array.isArray(cfg.occasionFilterOrder) && cfg.occasionFilterOrder.length) {
          setOccasionFilterOrder(cfg.occasionFilterOrder);
        }
        if (Array.isArray(cfg.defaultOccasionTypes) && cfg.defaultOccasionTypes.length) {
          setDefaultOccasionTypes(cfg.defaultOccasionTypes);
        }
      })
      .catch(() => {});

    loadPublicConfig();
    const timer = setInterval(loadPublicConfig, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!activeCityIds.includes(selectedCityId)) {
      setSelectedCityId(activeCityIds[0] || defaultCityIds[0]);
    }
  }, [activeCityIds, selectedCityId]);


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
  }, [ntpHost]);

  const activeCities = useMemo(
    () => activeCityIds.map((id) => allCities.find((city) => city.id === id)).filter(Boolean),
    [activeCityIds],
  );
  const activeSnapshots = useMemo(() => activeCities.map((city) => getCitySnapshot(now, city, language)), [activeCities, now, language]);
  const selectedCity = activeSnapshots.find((city) => city.id === selectedCityId) || activeSnapshots[0];
const selectedCityConfig = activeCities.find((city) => city.id === (selectedCity?.id || selectedCityId)) || activeCities[0];

  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    const title = language === 'fa'
      ? `ساعت در ${selectedCity.localFaLabel || selectedCity.label} | تاریخ امروز و ساعت دقیق`
      : `Time in ${selectedCity.label} now | Today date and exact time`;
    const description = language === 'fa'
      ? `ساعت دقیق ${selectedCity.localFaLabel || selectedCity.label}، تاریخ شمسی و میلادی، مناسبت‌ها، تعطیلات رسمی و منطقه زمانی ${selectedCity.timeZone} برای امروز.`
      : `Current time in ${selectedCity.label}, ${selectedCity.country}, with Persian and Gregorian dates, occasions, official holidays and ${selectedCity.timeZone} time zone details for today.`;

    document.title = title;
    document.documentElement.lang = language === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, [language, selectedCity]);

  const numberLocale = isFa ? 'fa-IR-u-nu-arabext' : 'en-US';
  const formatLocaleNumber = (value) => new Intl.NumberFormat(numberLocale).format(value);
  const formatLocaleYear = (value) => new Intl.NumberFormat(numberLocale, { useGrouping: false }).format(value);
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
      gregorianYear: formatLocaleYear(selectedCity.gregorianYear),
      persianYear: formatLocaleYear(selectedCity.persianYear),
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
    localStorage.setItem(userCitiesCustomizedKey, '1');
    setActiveCityIds((currentIds) => (currentIds.includes(cityId) ? currentIds : [...currentIds, cityId]));
    setSelectedCityId(cityId);
    setSearchQuery('');
  };

  const toggleEditMode = () => {
    setEditMode((currentMode) => !currentMode);
    setSearchQuery('');
  };

  const removeCity = (cityId) => {
    localStorage.setItem(userCitiesCustomizedKey, '1');
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
    localStorage.setItem(userCitiesCustomizedKey, '1');
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

  const cardOrder = getConfiguredCardOrder(cardOrderConfig);
  const cardComponents = {
    mainClock: h(
      'section',
      {
        className: `hero-panel fullscreen-background--${fullscreenBackground} fullscreen-time--${selectedCityView.timeOfDay}${isClockFullscreen ? ' app-viewport-fullscreen' : ''}${clockFullscreenControlsVisible ? ' fullscreen-controls-visible' : ''}`,
        style: { '--accent': selectedCityView.accent },
      },
      h(
        'div',
        { className: 'top-bar' },
        h('p', { className: 'eyebrow' }, language === 'fa' ? `${t.time_in} ${selectedCityView.country}، ` : `${t.time_in} `, h('strong', null, selectedCityView.label), language === 'fa' ? ` ${t.now_suffix}` : `, ${selectedCityView.country} ${t.now_suffix}`),
        h('div', { className: 'top-bar__controls' },
          isClockFullscreen && h(
            'button',
            { type: 'button', className: 'fullscreen-background-button', onClick: toggleFullscreenBackground },
            fullscreenBackground === 'dark' ? t.day_night_background : t.dark_background,
          ),
          h('button', { type: 'button', className: 'clock-focus-button', onClick: toggleClockFullscreen },
            isClockFullscreen ? t.exit_fullscreen : t.fullscreen,
          ),
          h('div', { className: 'language-picker', role: 'group', 'aria-label': t.language },
            h('div', { className: 'language-picker__segmented' },
              h('button', { type: 'button', className: language === 'en' ? 'selected' : '', onClick: () => setLanguage('en'), 'aria-pressed': language === 'en' }, t.english),
              h('button', { type: 'button', className: language === 'fa' ? 'selected' : '', onClick: () => setLanguage('fa'), 'aria-pressed': language === 'fa' }, t.persian),
            ),
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
    sunAndTimezones: h(
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
        onSelect: (cityId) => { localStorage.setItem(savedSelectedCityCustomizedKey, '1'); setSelectedCityId(cityId); },
        language,
      }),
    ),
    monthlyOccasions: h(MonthlyCalendarCard, { city: selectedCityView, t, language, initialOccasionTypes: defaultOccasionTypes, visibleOccasionTypes, occasionFilterOrder }),
    solarYearMoment: h(SolarYearMomentCard, { now, t, language }),
    dateTools: h(AgeConverterCard, { city: selectedCityConfig, timeZoneOptions: activeSnapshots, t, language, timeOffset, fullscreenBackground, timeOfDay: selectedCityView.timeOfDay, onFullscreenBackgroundToggle: toggleFullscreenBackground, onInteractionChange: setIsAgePickerActive }),
  };

  const footerLinks = [
    { label: 'imoein.com', href: 'https://imoein.com/' },
    { label: 'پروژه‌ها', href: 'https://imoein.com/portfolio.html?lang=fa' },
    { label: 'رزومه فارسی', href: 'https://imoein.com/resume/moein-ghezelbash-fa.html' },
    { label: 'رزومه انگلیسی', href: 'https://imoein.com/resume/moein-ghezelbash-en.html' },
  ];

  return h(
    'main',
    { className: `page-shell${isFa ? ' page-shell--rtl' : ''}`, 'aria-label': `${t.time_in} ${selectedCityView.label}` },
    ...cardOrder.map((cardId) => cardComponents[cardId]),
    h(
      'footer',
      { className: 'site-footer' },
      h(
        'nav',
        { className: 'site-footer__nav', 'aria-label': 'پیوندهای Moein Ghezelbash' },
        footerLinks.map((link) => h(
          'a',
          { key: link.href, className: 'site-footer__link', href: link.href },
          link.label,
        )),
      ),
      h('p', { className: 'site-footer__copyright' }, '© ۲۰۲۶ Moein Ghezelbash.'),
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
