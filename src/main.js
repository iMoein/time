import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { createElement: h } = React;

const cities = [
  { id: 'tehran', label: 'Tehran', country: 'Iran', timeZone: 'Asia/Tehran', accent: '#f97316' },
  { id: 'los-angeles', label: 'Los Angeles', country: 'United States', timeZone: 'America/Los_Angeles', accent: '#7c3aed' },
  { id: 'london', label: 'London', country: 'United Kingdom', timeZone: 'Europe/London', accent: '#2563eb' },
  { id: 'paris', label: 'Paris', country: 'France', timeZone: 'Europe/Paris', accent: '#db2777' },
  { id: 'tokyo', label: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', accent: '#059669' },
  { id: 'dubai', label: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai', accent: '#0891b2' },
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

function formatDate(date, timeZone, locale = 'en-US', calendar = 'gregory') {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    calendar,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getCitySnapshot(now, city) {
  const cityDate = getCityDate(now, city.timeZone);
  const gregorianDate = formatDate(now, city.timeZone);
  const localCalendar = city.id === 'tehran'
    ? formatDate(now, city.timeZone, 'fa-IR-u-nu-latn', 'persian')
    : gregorianDate;

  return {
    ...city,
    time: formatTime(now, city.timeZone),
    shortTime: formatTime(now, city.timeZone, false),
    gregorianDate,
    localCalendar,
    week: getWeekNumber(cityDate),
    calendarName: city.id === 'tehran' ? 'Persian calendar' : 'Gregorian calendar',
  };
}

function ToggleButton({ city, selected, onSelect }) {
  return h(
    'button',
    {
      type: 'button',
      className: `city-tab${selected ? ' selected' : ''}`,
      onClick: () => onSelect(city.id),
      style: { '--accent': city.accent },
      'aria-pressed': selected,
    },
    h('span', { className: 'city-tab__name' }, city.label),
    h('span', { className: 'city-tab__time' }, city.shortTime),
  );
}

function CityCard({ city, selected, onSelect }) {
  return h(
    'button',
    {
      type: 'button',
      className: `city-card${selected ? ' selected' : ''}`,
      onClick: () => onSelect(city.id),
      style: { '--accent': city.accent },
    },
    h('span', { className: 'city-card__topline' }, city.country),
    h('strong', null, city.label),
    h('span', { className: 'city-card__time' }, city.shortTime),
    h('span', { className: 'city-card__date' }, city.gregorianDate),
    h('span', { className: 'city-card__meta' }, `${city.calendarName} · week ${city.week}`),
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
  const [selectedCityId, setSelectedCityId] = useState('tehran');
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const snapshots = useMemo(() => cities.map((city) => getCitySnapshot(now, city)), [now]);
  const selectedCity = snapshots.find((city) => city.id === selectedCityId) || snapshots[0];

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    document.documentElement.requestFullscreen?.();
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
          { type: 'button', className: 'fullscreen-button', onClick: toggleFullscreen },
          isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
        ),
      ),
      h('h1', { className: 'clock', 'aria-live': 'polite' }, selectedCity.time),
      h(
        'div',
        { className: 'hero-meta' },
        h(InfoPill, { label: 'Date', value: selectedCity.gregorianDate }),
        h(InfoPill, { label: selectedCity.calendarName, value: selectedCity.localCalendar }),
        h(InfoPill, { label: 'Week of year', value: `Week ${selectedCity.week}` }),
      ),
    ),
    h(
      'section',
      { className: 'switcher-panel', 'aria-label': 'Switch city time' },
      h('div', { className: 'section-heading' }, h('span', null, 'Switch timezone'), h('strong', null, 'انتخاب شهر')),
      h(
        'div',
        { className: 'city-tabs' },
        snapshots.map((city) => h(ToggleButton, { city, selected: city.id === selectedCity.id, onSelect: setSelectedCityId, key: city.id })),
      ),
      h(
        'div',
        { className: 'city-grid' },
        snapshots.map((city) => h(CityCard, { city, selected: city.id === selectedCity.id, onSelect: setSelectedCityId, key: city.id })),
      ),
    ),
  );
}

createRoot(document.getElementById('root')).render(h(App));
