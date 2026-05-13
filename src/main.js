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

function addPersianMonths({ year, month }, monthOffset) {
  const zeroBasedMonth = month - 1 + monthOffset;
  const normalizedYear = year + Math.floor(zeroBasedMonth / 12);
  const normalizedMonth = ((zeroBasedMonth % 12) + 12) % 12;

  return { year: normalizedYear, month: normalizedMonth + 1 };
}

function findGregorianDateForPersianDate(year, month, day) {
  const estimatedDayOfYear = month <= 6 ? (month - 1) * 31 + day : 186 + (month - 7) * 30 + day;
  const estimate = new Date(Date.UTC(year + 621, 2, 15 + estimatedDayOfYear, 12));

  for (let offset = -8; offset <= 8; offset += 1) {
    const candidate = addUtcDays(estimate, offset);
    const parts = getPersianDatePartsFromUtc(candidate);

    if (parts.year === year && parts.month === month && parts.day === day) {
      return candidate;
    }
  }

  for (let offset = -370; offset <= 370; offset += 1) {
    const candidate = addUtcDays(new Date(Date.UTC(year + 621, 2, 20, 12)), offset);
    const parts = getPersianDatePartsFromUtc(candidate);

    if (parts.year === year && parts.month === month && parts.day === day) {
      return candidate;
    }
  }

  return estimate;
}

function formatGregorianMonthTitle(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatPersianMonthTitle(date) {
  return new Intl.DateTimeFormat('en-US-u-nu-latn', {
    timeZone: 'UTC',
    calendar: 'persian',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatSelectedCalendarDate(date, calendar) {
  return new Intl.DateTimeFormat('en-US-u-nu-latn', {
    timeZone: 'UTC',
    calendar,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getGregorianMonthCalendar(cityDate, monthOffset, selectedDateKey) {
  const monthDate = addUtcMonths(cityDate, monthOffset);
  const monthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1, 12));
  const gridStart = getMonthGridStart(monthStart, 1);

  return {
    id: 'gregorian',
    eyebrow: 'Gregorian monthly calendar',
    title: formatGregorianMonthTitle(monthStart),
    weekdays: gregorianWeekdays,
    selectedLabel: formatSelectedCalendarDate(selectedDateKey ? new Date(`${selectedDateKey}T12:00:00Z`) : cityDate, 'gregory'),
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
    title: formatPersianMonthTitle(monthStart),
    weekdays: persianWeekdays,
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
    jalaliWeek: getPersianWeekNumber(now, city.timeZone),
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
  const [monthOffsets, setMonthOffsets] = useState({ gregorian: 0, persian: 0 });
  const [selectedDateKeys, setSelectedDateKeys] = useState({ gregorian: todayKey, persian: todayKey });
  const calendars = [
    getGregorianMonthCalendar(city.cityDate, monthOffsets.gregorian, selectedDateKeys.gregorian),
    getPersianMonthCalendar(city.cityDate, monthOffsets.persian, selectedDateKeys.persian),
  ];
  const moveMonth = (calendarId, direction) => {
    setMonthOffsets((offsets) => ({ ...offsets, [calendarId]: offsets[calendarId] + direction }));
  };
  const resetMonth = (calendarId) => {
    setMonthOffsets((offsets) => ({ ...offsets, [calendarId]: 0 }));
    setSelectedDateKeys((dateKeys) => ({ ...dateKeys, [calendarId]: todayKey }));
  };
  const selectDay = (calendarId, dateKey) => {
    const selectedDate = new Date(`${dateKey}T12:00:00Z`);

    setSelectedDateKeys((dateKeys) => ({ ...dateKeys, [calendarId]: dateKey }));
    setMonthOffsets((offsets) => ({ ...offsets, [calendarId]: getCalendarMonthOffset(calendarId, city.cityDate, selectedDate) }));
  };
  const moveDay = (calendarId, direction) => {
    const activeDateKey = selectedDateKeys[calendarId] || todayKey;
    const nextDate = addUtcDays(new Date(`${activeDateKey}T12:00:00Z`), direction);
    selectDay(calendarId, getCalendarDateKey(nextDate));
  };

  return h(
    'section',
    { className: 'monthly-calendars', 'aria-label': `Monthly Gregorian and Solar Hijri calendars for ${city.label}` },
    calendars.map((calendar) => h(
      'article',
      { className: `monthly-calendar monthly-calendar--${calendar.id}`, key: calendar.id },
      h(
        'header',
        { className: 'monthly-calendar__header' },
        h('span', null, calendar.eyebrow),
        h('strong', null, calendar.title),
        h(
          'div',
          { className: 'monthly-calendar__actions', 'aria-label': `${calendar.title} navigation` },
          h('button', { type: 'button', onClick: () => moveMonth(calendar.id, -1), 'aria-label': `Previous ${calendar.eyebrow}` }, '‹'),
          h('button', { type: 'button', onClick: () => resetMonth(calendar.id) }, 'Today'),
          h('button', { type: 'button', onClick: () => moveMonth(calendar.id, 1), 'aria-label': `Next ${calendar.eyebrow}` }, '›'),
        ),
        h('small', null, `Selected: ${calendar.selectedLabel}`),
        h(
          'div',
          { className: 'monthly-calendar__day-actions', 'aria-label': `${calendar.title} selected day navigation` },
          h('button', { type: 'button', onClick: () => moveDay(calendar.id, -1) }, 'Previous day'),
          h('button', { type: 'button', onClick: () => moveDay(calendar.id, 1) }, 'Next day'),
        ),
      ),
      h(
        'div',
        { className: 'monthly-calendar__weekdays', 'aria-hidden': 'true' },
        calendar.weekdays.map((weekday) => h('span', { key: weekday }, weekday)),
      ),
      h(
        'div',
        { className: 'monthly-calendar__days' },
        calendar.days.map((day) => h(
          'button',
          {
            type: 'button',
            className: `monthly-calendar__day${day.isOutsideMonth ? ' monthly-calendar__day--outside' : ''}${day.isToday ? ' monthly-calendar__day--today' : ''}${day.isSelected ? ' monthly-calendar__day--selected' : ''}`,
            onClick: () => selectDay(calendar.id, day.dateKey),
            'aria-pressed': day.isSelected,
            key: day.id,
          },
          h('span', null, day.number),
        )),
      ),
    )),
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


createRoot(document.getElementById('root')).render(h(App));
