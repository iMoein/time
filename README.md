# Time in Tehran

A lightweight Node.js and React single-page world-clock app inspired by Time.is, with Tehran selected by default.

## Features

- Live clock with seconds for the selected city.
- One-click switching between the active city cards.
- Enter edit mode to add or remove cities only when you want to manage the dashboard.
- Search thousands of IANA time zones from a compact dropdown by city, region, or timezone name.
- Saved city selections in the browser so the dashboard survives refreshes.
- Date, calendar label, and ISO week number for every active city.
- Persian calendar display for Tehran alongside the Gregorian date.
- Fullscreen button for dashboard-style usage.
- Responsive UI that works on desktop, tablet, and mobile.

## Run locally

```bash
npm start
```

Then open <http://localhost:8585> in your browser.

## Check syntax

```bash
npm run check
```

> The app uses local browser modules through an import map, so the UI keeps loading after the server is started even when the internet is unavailable.
