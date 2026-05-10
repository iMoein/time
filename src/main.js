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
  const gregorianDate = formatDate(now, city.timeZone);
  const persianDate = formatDate(now, city.timeZone, 'en-US-u-nu-latn', 'persian').replace(/ AP$/, '');
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
    gregorianWeek: getWeekNumber(cityDate),
    jalaliWeek: getPersianWeekNumber(now, city.timeZone),
    timeOfDay: timeOfDay.id,
    timeOfDayLabel: timeOfDay.label,
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
      h(
        'div',
        { className: 'hero-content' },
        h('h1', { className: 'clock', 'aria-live': 'polite' }, selectedCity.time),
        h(
          'div',
          { className: 'hero-meta', 'aria-label': 'Calendar details' },
          h(InfoPill, { label: 'Gregorian date', value: selectedCity.gregorianDate }),
          h(InfoPill, { label: 'Solar Hijri date', value: selectedCity.persianDate }),
          h(InfoPill, { label: 'Gregorian week', value: `Week ${selectedCity.gregorianWeek}` }),
          h(InfoPill, { label: 'Solar Hijri week', value: `Week ${selectedCity.jalaliWeek}` }),
        ),
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
