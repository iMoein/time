import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { createElement: h } = React;

const accentPalette = ['#f97316', '#7c3aed', '#2563eb', '#db2777', '#059669', '#0891b2', '#ea580c', '#4f46e5'];

const defaultCities = [
  { id: 'tehran', label: 'Tehran', country: 'Iran', timeZone: 'Asia/Tehran', accent: accentPalette[0] },
  { id: 'los-angeles', label: 'Los Angeles', country: 'United States', timeZone: 'America/Los_Angeles', accent: accentPalette[1] },
  { id: 'london', label: 'London', country: 'United Kingdom', timeZone: 'Europe/London', accent: accentPalette[2] },
  { id: 'paris', label: 'Paris', country: 'France', timeZone: 'Europe/Paris', accent: accentPalette[3] },
  { id: 'tokyo', label: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', accent: accentPalette[4] },
  { id: 'dubai', label: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai', accent: accentPalette[5] },
];

const savedCitiesKey = 'time-app-cities';

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

function ToggleButton({ city, selected, canRemove, onRemove, onSelect }) {
  return h(
    'article',
    { className: `city-tab${selected ? ' selected' : ''}`, style: { '--accent': city.accent } },
    h(
      'button',
      {
        type: 'button',
        className: 'city-tab__main',
        onClick: () => onSelect(city.id),
        'aria-pressed': selected,
      },
      h('span', { className: 'city-tab__name' }, city.label),
      h('span', { className: 'city-tab__time' }, city.shortTime),
    ),
    canRemove && h(
      'button',
      { type: 'button', className: 'remove-chip', onClick: () => onRemove(city.id), 'aria-label': `Remove ${city.label}` },
      '×',
    ),
  );
}

function CityCard({ city, selected, canRemove, onRemove, onSelect }) {
  return h(
    'article',
    { className: `city-card${selected ? ' selected' : ''}`, style: { '--accent': city.accent } },
    h(
      'button',
      { type: 'button', className: 'city-card__main', onClick: () => onSelect(city.id) },
      h('span', { className: 'city-card__topline' }, city.country),
      h('strong', null, city.label),
      h('span', { className: 'city-card__time' }, city.shortTime),
      h('span', { className: 'city-card__date' }, city.gregorianDate),
      h('span', { className: 'city-card__meta' }, `${city.calendarName} · week ${city.week}`),
    ),
    canRemove && h(
      'button',
      { type: 'button', className: 'city-card__remove', onClick: () => onRemove(city.id), 'aria-label': `Remove ${city.label}` },
      'Remove',
    ),
  );
}

function SearchPanel({ query, results, onAdd, onQueryChange }) {
  const hasQuery = query.trim().length > 0;

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
        onChange: (event) => onQueryChange(event.target.value),
        placeholder: 'Try New York, Berlin, Istanbul, Sydney...',
        autoComplete: 'off',
      }),
    ),
    hasQuery && h(
      'div',
      { className: 'search-results', 'aria-live': 'polite' },
      results.length > 0
        ? results.map((city) => h(
          'button',
          { type: 'button', className: 'search-result', onClick: () => onAdd(city.id), key: city.id, style: { '--accent': city.accent } },
          h('span', null, city.label),
          h('small', null, `${city.country} · ${city.timeZone}`),
          h('strong', null, '+ Add'),
        ))
        : h('p', { className: 'search-empty' }, 'No city found, try another city or timezone name.'),
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
  const [activeCityIds, setActiveCityIds] = useState(getInitialCityIds);
  const [selectedCityId, setSelectedCityId] = useState(activeCityIds[0] || defaultCityIds[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(savedCitiesKey, JSON.stringify(activeCityIds));
  }, [activeCityIds]);

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

  const activeCities = useMemo(
    () => activeCityIds.map((id) => allCities.find((city) => city.id === id)).filter(Boolean),
    [activeCityIds],
  );
  const activeSnapshots = useMemo(() => activeCities.map((city) => getCitySnapshot(now, city)), [activeCities, now]);
  const selectedCity = activeSnapshots.find((city) => city.id === selectedCityId) || activeSnapshots[0];
  const activeIdSet = useMemo(() => new Set(activeCityIds), [activeCityIds]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return allCities
      .filter((city) => !activeIdSet.has(city.id))
      .filter((city) => `${city.label} ${city.country} ${city.timeZone}`.toLowerCase().includes(query))
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
      h(
        'div',
        { className: 'section-heading' },
        h('span', null, 'Manage timezones'),
        h(
          'div',
          { className: 'heading-actions' },
          h('strong', null, editMode ? 'Search, add, and remove cities' : 'Switch between your saved cities'),
          h('button', { type: 'button', className: 'edit-toggle', onClick: toggleEditMode }, editMode ? 'Done' : 'Edit'),
        ),
      ),
      editMode && h(SearchPanel, { query: searchQuery, results: searchResults, onAdd: addCity, onQueryChange: setSearchQuery }),
      h(
        'div',
        { className: 'city-tabs' },
        activeSnapshots.map((city) => h(ToggleButton, {
          city,
          selected: city.id === selectedCity.id,
          canRemove: editMode && activeSnapshots.length > 1,
          onRemove: removeCity,
          onSelect: setSelectedCityId,
          key: city.id,
        })),
      ),
      h(
        'div',
        { className: 'city-grid' },
        activeSnapshots.map((city) => h(CityCard, {
          city,
          selected: city.id === selectedCity.id,
          canRemove: editMode && activeSnapshots.length > 1,
          onRemove: removeCity,
          onSelect: setSelectedCityId,
          key: city.id,
        })),
      ),
    ),
  );
}


createRoot(document.getElementById('root')).render(h(App));
