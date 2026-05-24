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


## Admin API quick reference (cURL)

> Base URL for **admin APIs**: `http://localhost:8686`
>
> User app runs on: `http://localhost:8585`

### 1) Get captcha
```bash
curl -s http://localhost:8686/api/admin/captcha
```

### 2) Login (creates session cookie)
```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","captcha":"1234"}' \
  http://localhost:8686/api/admin/login
```

### 3) Check admin session
```bash
curl -s -b cookies.txt http://localhost:8686/api/admin/session
```

### 4) Logout
```bash
curl -s -X POST -b cookies.txt http://localhost:8686/api/admin/logout
```

### 5) Change initial password
```bash
curl -s -X POST -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"StrongPassword123!"}' \
  http://localhost:8686/api/admin/change-password
```

### 6) Read admin config
```bash
curl -s -b cookies.txt http://localhost:8686/api/admin/config
```

### 7) Save admin config
```bash
curl -s -X POST -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "ntpHost":"pool.ntp.org",
    "defaultCityIds":["asia-tehran","europe-london"],
    "defaultSelectedCityId":"asia-tehran",
    "defaultOccasionTypes":["international","globalOfficial"]
  }' \
  http://localhost:8686/api/admin/config
```

### 8) List JSON files
```bash
curl -s -b cookies.txt http://localhost:8686/api/admin/json-files
```

### 9) Read one JSON file
```bash
curl -s -b cookies.txt \
  "http://localhost:8686/api/admin/json-file?file=calendar-files%2FREADME.json"
```

### 10) Save one JSON file
```bash
curl -s -X POST -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "file":"calendar-files/README.json",
    "content":{"updatedAt":"2026-05-24T00:00:00Z"}
  }' \
  http://localhost:8686/api/admin/json-file
```

### 11) NTP check
```bash
curl -s "http://localhost:8686/api/ntp?host=pool.ntp.org"
```
