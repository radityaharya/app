# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Commuter** is a personal commuter transit helper for Indonesian KRL trains. It has two apps in a monorepo:
- `apps/api` — Go REST API that fetches from the KRL partner API and caches data in SQLite
- `apps/mobile` — React Native (Expo) mobile app with background location tracking and push notifications

## Commands

### Root (runs via Turbo across all packages)
```bash
pnpm dev:api      # Start Go API with hot-reload (air)
pnpm dev:mobile   # Start Expo dev server
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # TypeScript check all packages
```

### API (`apps/api`)
```bash
pnpm --filter api dev          # Hot-reload via air
go build -o bin/api ./cmd/api  # Build binary
go vet ./...                   # Lint
```

### Mobile (`apps/mobile`)
```bash
pnpm --filter mobile start    # Expo dev server
expo run:android               # Run on Android
expo run:ios                   # Run on iOS
expo lint                      # Lint
```

**Requirements:** Node.js >=20.19.4, pnpm >=9, Go 1.25.0

## Architecture

### Data Flow
```
KRL Partner API (api-partner.krl.co.id)
    ↓
Go API (port 8080)
    ├── krl/    — HTTP client; scrapes Bearer token from kci.id schedule page via regex
    ├── store/  — SQLite cache (stations, schedules tables)
    ├── sync/   — Background syncer (startup + daily midnight WIB)
    └── handler/ — REST endpoints
    ↓
React Native Mobile App
    ├── Expo Router (file-based routing in src/app/)
    ├── expo-sqlite — local cache (settings, monitored_stations, schedules, shortcuts)
    ├── expo-location — background geofencing for proximity alerts
    └── Expo Push Service — notification delivery
```

### API Endpoints
| Route | Handler | Notes |
|-------|---------|-------|
| `GET /health` | Health | Returns `{status, timestamp}` |
| `GET /v1/stations` | Stations | From SQLite cache |
| `GET /v1/stations/{id}` | Single station | ID normalized to uppercase |
| `GET /v1/schedule/{station_id}` | Schedules | Falls back to live fetch if cache stale; deduplicates concurrent requests per station |
| `POST /notifications/send` | Push | Forwards to Expo Push Service |

### API Internals (`apps/api/internal/`)
- **config/** — Loads `PORT`, `DB_PATH`, `EXPO_PUSH_URL` from environment
- **krl/** — KRL API client; token is scraped dynamically from the public KCI website (no static API key)
- **store/** — SQLite wrapper; schedules cached by station, validated by WIB date (UTC+7)
- **sync/** — Goroutine scheduler; runs full station sync at startup and daily at midnight WIB
- **handler/** — HTTP handlers; schedule handler uses a per-station in-flight map to prevent thundering herd
- **push/** — Thin forwarder to `https://exp.host/--/api/v2/push/send`

### Mobile Internals (`apps/mobile/src/`)
- **app/** — Expo Router screens; `(tabs)/` contains the main tab group
- **lib/api.ts** — `apiFetch` wrapper pointing to `EXPO_PUBLIC_API_URL`
- **lib/db.ts** — Expo SQLite schema (settings, monitored_stations, schedules, shortcuts)
- **hooks/** — `useSchedule`, `useStations`, `useMonitoredStations`, `useLocation`, `useNotifications`
- **tasks/locationTask.ts** — Expo background task for continuous location tracking
- **context/ThemeContext.tsx** — Dark/light theme

### Shared Package (`packages/shared/`)
TypeScript interfaces shared between mobile and any future clients: `Stop`, `Coordinates`, `PushSendRequest`, `PushSendResponse`, `ProximityNotificationData`, `HealthResponse`.

## Key Design Decisions

- **Token scraping:** The KRL API requires a Bearer token that is obtained by regex-scraping the public kci.id JavaScript bundle at request time. This lives in `apps/api/internal/krl/`.
- **WIB timezone:** All cache validity checks and daily sync scheduling use Asia/Jakarta (UTC+7), not UTC.
- **Concurrent request deduplication:** `handler/schedule.go` holds a `sync.Map` of in-flight station fetches; subsequent requests for the same station block on the same channel rather than triggering parallel API calls.
- **Styling:** Tailwind CSS 4.x via Uniwind (React Native Tailwind adapter). Design system is defined in `DESIGN.md` — Berkeley Mono typeface only, warm cream `#fdfcfc` / ink `#201d1d` palette.
- **Expo version:** Currently on Expo 56.x — refer to versioned Expo docs when checking API compatibility (noted in `apps/mobile/AGENTS.md`).

## Environment Variables

**API** (`.env` in `apps/api/`):
```
PORT=8080
DB_PATH=commuter.db
EXPO_PUSH_URL=https://exp.host/--/api/v2/push/send
```

**Mobile** (`.env` in `apps/mobile/`):
```
EXPO_PUBLIC_API_URL=http://<your-api-host>:8080
```
