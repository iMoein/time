# Time in Tehran

A lightweight Node.js and React single-page world-clock app inspired by Time.is, with Tehran selected by default.

## Features

- Live clock with seconds for the selected city.
- One-click switching between the active city cards.
- Search thousands of IANA time zones by city, region, or timezone name.
- Add new cities to the dashboard and remove cities you no longer need.
- Saved city selections in the browser so the dashboard survives refreshes.
- Date, calendar label, and ISO week number for every active city.
- Persian calendar display for Tehran alongside the Gregorian date.
- Fullscreen button for dashboard-style usage.
- Responsive UI that works on desktop, tablet, and mobile.

## Run locally

```bash
npm start
```

Then open <http://localhost:3000> in your browser.

## Check syntax

```bash
npm run check
```

> React is loaded in the browser through an import map CDN so the project can run without installing npm packages.
