# SwachhLens AI

AI-assisted waste reporting for cities.
- Citizens photograph a pile of waste and submit it from a mobile app.
- An AI model describes the scene.
- Fixed, explainable rules set the priority.
- Likely duplicates are suggested to staff, who confirm them.
- Municipal staff plan the day's work within real crew capacity, and record clean-up evidence.

| Folder | What it is |
| --- | --- |
| [`backend/`](backend) | Express 5 + Prisma 7 + PostgreSQL API, Google Gemini (`@google/genai`) |
| [`WebPortal/`](WebPortal) | React + Vite portal: admin dashboard and a phone-friendly staff view |
| [`MobileApp/`](MobileApp) | React Native 0.87 citizen app (the `android/` folder must be generated: see below) |

The demo kit: [DEMO.md](DEMO.md) (4–5 minute script and failure playbook) and [DOC_CORRECTIONS.md](DOC_CORRECTIONS.md) (fixes for the project PDF).

## Architecture

```
+-----------------------------+          +--------------------------------------+
| Citizen app (React Native)  |          | Operations portal (React + Vite)     |
| report waste, see AI result,|          | admin: list, map, plan, analytics    |
| track status + history      |          | staff: "My tasks" + after photo      |
+--------------+--------------+          +------------------+-------------------+
               | JSON / multipart, JWT                      | JSON, JWT, polls every 10s
               v                                            v
+-----------------------------------------------------------------------------------+
| Express 5 API  (backend/)        helmet, CORS allowlist, rate limits, Zod         |
|  routes: /auth  /complaints  /assignments  /admin  /resources                     |
|                                                                                   |
|  ai.service ------------> 1 multimodal call: photo + text -> structured features  |
|      |                    1 call: duplicate judgment (yes / no / unsure)          |
|      +-- ai.cache         AI_MODE=cached: stored demo answers for known inputs    |
|  priority.service ------> fixed rules: features -> priority, crew, time, reasons  |
|  plan.service ----------> greedy daily plan within worker/vehicle minutes         |
|  event.service ---------> audit trail of every status change and decision         |
|  analytics.service -----> live aggregates + CSV export                            |
+------------+-------------------------------------------+--------------------------+
             |                                           |
             v                                           v
   Google Gemini API                     PostgreSQL (Prisma 7)       backend/src/uploads/
   (model: GEMINI_MODEL)                 complaints, events, plans   photos on local disk
```

### A complaint's path

1. **Submit.** The citizen app sends the description, GPS coordinates, an optional photo and an `Idempotency-Key`, so retries never create duplicates.
2. **Describe.** One Gemini call reads the photo and text and returns structured features: waste type, relative volume (never kilograms), hazards, blocked road, near a school/hospital/market, a summary of up to 40 words, and confidence.
3. **Prioritise.** [`priority.service.ts`](backend/src/services/priority.service.ts) scores those features with fixed rules and stores a `priorityReasons` list. The AI never decides priority, crew size or vehicles.
4. **Find duplicates.** Up to 5 active reports within 500 m are judged yes/no/unsure. The nearest match is stored as a *suggestion*; nothing merges until staff confirm it.
5. **Handle failure.** If Gemini is unavailable, the complaint is still saved with keyword-only features, `aiSource = fallback` and `needsManualReview = true`.
6. **Plan, assign, resolve.** Admins generate today's plan, assign staff, and staff complete the work with an after photo and the weighed kilograms. Every step is written to the event timeline.

## Setup from scratch

**You need:** Node.js 22.11 or newer, PostgreSQL 15+ (local or [Neon](https://neon.tech)), and Android Studio for the mobile app. A Gemini API key is optional for the demo.

### 1. Database

Local Postgres:

```sh
createdb swachhlens
```

On Neon, use the **pooled** connection string for `DATABASE_URL`, and the **direct** one (without `-pooler`) when you run `prisma migrate` commands.

### 2. Backend

```sh
cd backend
```

```sh
npm install
```

```sh
cp .env.example .env
```

Edit `.env`: set at least `DATABASE_URL` and `JWT_SECRET`. For a demo, keep `AI_MODE=cached` and `DEMO_MODE=true`. Then:

```sh
npx prisma migrate deploy
```

```sh
npx prisma db seed
```

```sh
npx tsx server.ts
```

Check: http://localhost:5000/api/health. To check a Gemini key: `npm run gemini:smoke`.

### 3. Web portal

```sh
cd WebPortal
```

```sh
npm install
```

```sh
npm run dev
```

Open http://localhost:5173. Set `VITE_API_URL` in `WebPortal/.env.local` if the API is not at `http://localhost:5000/api`.

### 4. Mobile app

1. Generate `android/` (the exact commands are in [MobileApp/README.md](MobileApp/README.md#android-regenerating-the-android-folder)).
2. Set `API_HOST_OVERRIDE` in [`MobileApp/src/constants/config.ts`](MobileApp/src/constants/config.ts) to your computer's LAN address, e.g. `'http://192.168.1.42:5000'`.
3. Run:

```sh
cd MobileApp
```

```sh
npm install
```

```sh
npm run android
```

## Demo accounts

Created by `npx prisma db seed`. **Demo use only**: anyone reading this file knows these passwords.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@swachhlens.demo` | `SwachhDemo#2026` |
| Field staff | `staff1@swachhlens.demo`, `staff2@swachhlens.demo`, `staff3@swachhlens.demo` | `SwachhDemo#2026` |
| Citizen (mobile app) | `citizen1@swachhlens.demo`, `citizen2@swachhlens.demo`, `citizen3@swachhlens.demo` | `SwachhDemo#2026` |

Admins land on the dashboard; staff land on "My tasks". Citizens use the mobile app; the portal refuses them.

### Seeded data is simulated

The seed creates 47 complaints across 35 incidents in Lajpat Nagar, South Delhi (approximate locations). They include 9 groups of duplicate reports, 5 CRITICAL incidents, 11 resolved complaints with a weighed amount and an "after" photo, and 130 history events.

**All of it is simulated.** The images are labelled placeholders, and the weights and AI features are hand-written demo values. These rows have `isSimulated = true`; the portal and app label them "Simulated", and analytics reports how much data is simulated and can exclude it. Re-running the seed replaces only simulated rows.

## Environment variables

Backend (`backend/.env`; [`.env.example`](backend/.env.example) lists exactly these):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `JWT_SECRET` | required | Signs login tokens (7-day expiry) and keys the OTP hashes |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | `production` makes email delivery mandatory |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins allowed to call the API |
| `TRUST_PROXY` | `0` | Number of proxies in front of the API (set `1` behind a tunnel) |
| `ENABLE_REQUEST_LOGGING` | `true` | Per-request logs |
| `GENERAL_RATE_LIMIT_MAX` | `1000` | Requests per IP per 15 min, all `/api` |
| `AUTH_RATE_LIMIT_MAX` | `10` | Requests per IP per 15 min on `/api/auth/*` |
| `COMPLAINT_RATE_LIMIT_MAX` | `20` | Complaints per user per hour |
| `GEMINI_API_KEY` | empty | Without it, uncached input falls back to keyword rules plus manual review |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Gemini model id |
| `AI_MODE` | `live` | `cached` = stored demo answers for known demo inputs, everything else live |
| `DEMO_MODE` | `false` | `true` = signup without OTP, accounts verified immediately |
| `EMAIL_USER`, `EMAIL_PASSWORD` | empty | Gmail account for OTP mail; outside production, codes go to the server log when unset |
| `MAX_FILE_SIZE` | `5242880` | Upload limit in bytes (can only lower the 5 MB cap) |
| `HOTSPOT_RADIUS_METERS` | `500` | Hotspot clustering radius |
| `DUPLICATE_RADIUS_METERS` | `500` | Duplicate-candidate search radius |
| `DEFAULT_WORKERS`, `DEFAULT_HEAVY_VEHICLES` | `15`, `5` | Crew used when no Resource row exists for today |
| `SHIFT_MINUTES` | `480` | Shift length used for plan capacity |

Portal (`WebPortal/.env.local`): `VITE_API_URL`, default `http://localhost:5000/api`.

Mobile (constants in [`config.ts`](MobileApp/src/constants/config.ts), not env vars):
- `API_HOST_OVERRIDE`: backend address.
- `DEMO_LOCATION_OVERRIDE`: fixed coordinates for a demo away from the seeded area. It is labelled on screen.

## How the parts work

- **Priority rules:** hazardous material +4, blocking a road +3, near a school/hospital/market +2, volume Massive/Large/Medium +3/+2/+1, and +1/+2 when 3+/6+ citizens report it. Urgency = 1 + points; CRITICAL ≥ 7, STANDARD ≥ 3. An admin can override the priority with a mandatory reason, which survives re-scoring.
- **Today's plan:**
  - Capacity is workers × shift minutes and heavy vehicles × shift minutes.
  - Work that is already assigned is reserved first.
  - Pending complaints are then taken by urgency, then votes, then age, as long as they fit. Each deferral comes with a reason, and capacity is never exceeded.
- **Audit trail:** a `ComplaintEvent` row is written for every status change, assignment, merge, duplicate confirm or reject, and priority override.
- **Analytics:** computed live from the database. It covers status and waste-type counts, the last 7 days, average resolution time, and duplicate decisions. It also compares the AI's relative-volume estimate with the kilograms staff actually weighed.
- **Evaluation:** `npm run eval` (backend) scores the real Gemini judge and scorer against hand-labelled rows in [`backend/eval/`](backend/eval/README.md). The portal shows the latest run. No real evaluation has been run yet.

## Security defaults

- **Access control:** citizens see only their own complaints and never reporter emails or staff IDs. Editing, verifying and assigning are staff/admin only.
- **Validation:** every request body is validated with Zod.
- **Uploads:** JPEG, PNG or WebP up to 5 MB, checked by their actual bytes, and stored under random names.
- **Rate limits** and a **CORS** allowlist. 500 errors return a generic message; the details go to the server log.
- **OTP codes** (when `DEMO_MODE=false`) are random and stored only as an HMAC hash. Each code allows 5 attempts, and every failure gets the same generic message.

## Useful commands

| Where | Command | Does |
| --- | --- | --- |
| backend | `npx tsx server.ts` / `npm run dev` | Run the API |
| backend | `npx prisma migrate deploy` | Apply migrations |
| backend | `npx prisma db seed` | Reset demo accounts and simulated data |
| backend | `npm run build` | Type-check and compile |
| backend | `npm run gemini:smoke` | One real Gemini call: prints the result or the exact error |
| backend | `npm run eval` | Evaluation harness |
| WebPortal | `npm run dev` / `npm run build` | Portal dev server / production build |
| MobileApp | `npm test` / `npx tsc --noEmit` | Jest tests / type check |

## Known limitations / not built

- **No real-time push.** The portal polls (10 s for lists, 30 s for staff tasks) and the app refreshes when a screen opens. There are no push notifications or WebSockets.
- **No recycler marketplace.** An unfinished marketplace was removed; it is not part of the product.
- **The Android project must be regenerated** from the React Native template, and the Nearby map needs a Google Maps API key. The `ios/` folder exists but has not been built or tested.
- **AI accuracy is measured only on the evaluation set**, and that set currently holds only format examples. No accuracy figure has been established yet. The configured Gemini model id has not been verified against the live API in the development environment (no key was available); run `npm run gemini:smoke`.
- **Demo data is simulated** (see above). Any numbers in a demo reflect seeded data unless the "Real reports only" view is used.
- **Accounts:** no password reset, account deletion or data export. A role change takes effect when the user's token expires (up to 7 days).
- **Rate limits** are in memory: per process, and reset on restart.
- **Photos** are stored on the API server's disk and served from public, unguessable URLs. There is no object storage or signed URLs. Eight photos from early testing are still tracked in git.
- **No API to edit daily resources** (workers and vehicles); change them in the database. "Today" is a UTC day.
- **Hotspots** are simple 500 m greedy clusters, not a clustering algorithm such as DBSCAN.
- **No automated backend test suite.** The backend was verified with scripted API calls during development; only the mobile app has Jest tests.
- **English only**, and the portal ships as one bundle (about 1 MB, no code splitting).
- **Latency** depends on the database's distance: each query to a remote Postgres (e.g. Neon in another region) costs about 250 ms.
