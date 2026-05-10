import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { createElement: h } = React;
const TEHRAN_TIME_ZONE = 'Asia/Tehran';
const TEHRAN_COORDINATES = { latitude: 35.6892, longitude: 51.389 };

const cityCards = [
  { label: 'Los Angeles', timeZone: 'America/Los_Angeles' },
  { label: 'London', timeZone: 'Europe/London' },
  { label: 'Paris', timeZone: 'Europe/Paris' },
  { label: 'Tehran', timeZone: TEHRAN_TIME_ZONE, active: true },
];

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

function getDayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000) + 1;
}

function getWeekNumber(date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
}

function formatTehranDate(date) {
  const dateText = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const tehranParts = getZonedDateParts(date, TEHRAN_TIME_ZONE);
  const tehranNoon = new Date(Date.UTC(tehranParts.year, tehranParts.month - 1, tehranParts.day, 12));
  return `${dateText}, week ${getWeekNumber(tehranNoon)}`;
}

function calculateSunTime(date, latitude, longitude, isSunrise) {
  const dayOfYear = getDayOfYear(date);
  const longitudeHour = longitude / 15;
  const approximateTime = dayOfYear + ((isSunrise ? 6 : 18) - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  let trueLongitude = meanAnomaly + 1.916 * Math.sin((Math.PI / 180) * meanAnomaly) + 0.020 * Math.sin((Math.PI / 180) * 2 * meanAnomaly) + 282.634;
  trueLongitude = (trueLongitude + 360) % 360;

  let rightAscension = (180 / Math.PI) * Math.atan(0.91764 * Math.tan((Math.PI / 180) * trueLongitude));
  rightAscension = (rightAscension + 360) % 360;
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin((Math.PI / 180) * trueLongitude);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle = (Math.cos((Math.PI / 180) * 90.833) - sinDeclination * Math.sin((Math.PI / 180) * latitude)) / (cosDeclination * Math.cos((Math.PI / 180) * latitude));
  const hourAngle = (isSunrise ? 360 - (180 / Math.PI) * Math.acos(cosHourAngle) : (180 / Math.PI) * Math.acos(cosHourAngle)) / 15;
  const localMeanTime = hourAngle + rightAscension - 0.06571 * approximateTime - 6.622;
  const utcHour = (localMeanTime - longitudeHour + 24) % 24;
  const hour = Math.floor(utcHour);
  const minute = Math.round((utcHour - hour) * 60);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute));
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function getSunDetails(now) {
  const tehranDateParts = getZonedDateParts(now, TEHRAN_TIME_ZONE);
  const tehranCalendarDate = new Date(Date.UTC(tehranDateParts.year, tehranDateParts.month - 1, tehranDateParts.day));
  const sunrise = calculateSunTime(tehranCalendarDate, TEHRAN_COORDINATES.latitude, TEHRAN_COORDINATES.longitude, true);
  const sunset = calculateSunTime(tehranCalendarDate, TEHRAN_COORDINATES.latitude, TEHRAN_COORDINATES.longitude, false);

  return {
    sunrise: formatTime(sunrise, TEHRAN_TIME_ZONE, false),
    sunset: formatTime(sunset, TEHRAN_TIME_ZONE, false),
    daylight: formatDuration(sunset - sunrise),
  };
}

function CityCard({ city, now }) {
  return h(
    'article',
    { className: `city-card${city.active ? ' active' : ''}` },
    h('strong', null, city.label),
    h('span', null, formatTime(now, city.timeZone, false)),
  );
}

function App() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sunDetails = useMemo(() => getSunDetails(now), [now]);

  return h(
    'main',
    { className: 'page-shell', 'aria-label': 'Current time in Tehran' },
    h(
      'section',
      { className: 'hero-panel' },
      h('p', { className: 'eyebrow' }, 'Time in ', h('strong', null, 'Tehran'), ', Iran now'),
      h('h1', { className: 'clock', 'aria-live': 'polite' }, formatTime(now, TEHRAN_TIME_ZONE)),
    ),
    h(
      'section',
      { className: 'details-panel', 'aria-label': 'Tehran date and world clocks' },
      h('p', { className: 'date-line' }, formatTehranDate(now)),
      h(
        'p',
        { className: 'sun-line' },
        `Sun: ↑ ${sunDetails.sunrise} ↓ ${sunDetails.sunset} (${sunDetails.daylight}) - `,
        h('a', { href: '#tehran-default' }, 'Make Tehran time default'),
        ' -',
      ),
      h(
        'div',
        { className: 'city-grid', id: 'tehran-default' },
        cityCards.map((city) => h(CityCard, { city, now, key: city.label })),
      ),
    ),
  );
}

createRoot(document.getElementById('root')).render(h(App));
