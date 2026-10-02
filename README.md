# CivicClean: AI-Powered Waste Management

| Folder | What it is |
| --- | --- |
| `backend/` | Express 5 + Prisma 7 + PostgreSQL API, Gemini for AI analysis |
| `WebPortal/` | Vite + React admin portal |
| `MobileApp/` | React Native citizen app (see [MobileApp/README.md](MobileApp/README.md) to point it at your backend) |

## Backend setup

```bash
cd backend
npm install
cp .env.example .env          # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate deploy     # create the schema
npx prisma db seed            # load demo accounts + simulated complaints
npx tsx server.ts             # http://localhost:5000/api/health
```

On Neon, run `prisma migrate` commands against the **direct** host (the URL without `-pooler`). The pooled URL is fine for the server and the seed.

## Demo mode

Two flags in `backend/.env` keep the live demo independent of external services:

| Flag | Effect |
| --- | --- |
| `DEMO_MODE=true` | Signup creates verified accounts immediately (no OTP email). With `false`, users must enter the emailed 6-digit code before they can log in. |
| `AI_MODE=cached` | Known demo descriptions and seed images get their stored analysis instantly. Anything else goes to Gemini. `AI_MODE=live` sends everything to Gemini. |

## How a complaint is processed

1. **One AI call** (`GEMINI_MODEL`, 8s timeout) reads the photo and description and returns structured features: waste type and categories, relative volume (never kg), condition, hazards, accessibility, equipment, blocked road, near a school/hospital/market, a summary of up to 40 words, and confidence.
2. **Priority is not decided by the AI.** [`priority.service.ts`](backend/src/services/priority.service.ts) scores the features with fixed rules (hazardous +4, blocked road +3, sensitive site +2, volume +1 to +3, a capped bonus for multiple reports). It stores the priority, crew size, vehicles, time and a `priorityReasons` list explaining each point.
3. **Duplicates are only suggested.** Up to 5 active complaints within `DUPLICATE_RADIUS_METERS` are judged yes/no/unsure by the AI. The nearest "yes" (or "unsure") is stored as `duplicateSuggestionOfId`. Staff link it with `POST /api/complaints/:id/confirm-duplicate`, which adds the report as a vote and re-scores the original.
4. **Failures are visible.** If Gemini is unavailable or errors, the complaint is still saved with keyword-only features, `aiSource = fallback` and `needsManualReview = true`, and the error is logged and returned in `ai.errors`.

`aiSource` is one of `gemini`, `cached`, `seed` or `fallback`. Mobile retries send the same `Idempotency-Key` header, so a slow network never creates a complaint twice.

Check a Gemini key with `npm run gemini:smoke` in `backend/`. It makes one real call and prints the result or the exact error.

## Admin operations

All of these require an ADMIN token.

| Endpoint | What it does |
| --- | --- |
| `POST /api/admin/plan/generate` | Builds today's plan (see below). |
| `GET /api/admin/plan/today` | Returns the stored plan for today. Staff see it as `GET /api/complaints/todays-tasks`. |
| `PATCH /api/admin/complaints/:id/priority` | Sets a priority by hand. `{ priority, reason }` is required; the override survives re-scoring when votes change. |
| `GET /api/admin/complaints/:id/events` | The audit trail: created, every status change, assignment, merge, duplicate confirm/reject, priority override, with who did it and why. |
| `GET /api/admin/analytics` | Live aggregates: counts by status and waste type, created vs resolved over the last 7 days, average resolution hours, duplicate suggestions confirmed/rejected/pending, and AI volume estimate vs weighed kg. |
| `GET /api/admin/reports/export.csv` | Complaint export. It contains no reporter emails, and an `isSimulated` column keeps demo data labelled. |
| `GET /api/admin/complaints?take=25&skip=0&status=Pending` | Paginated complaint list (`take` at most 100). |

Analytics and the export accept `?includeSimulated=false` to use real data only. Analytics always reports how many rows are simulated in `dataset`.

**How the plan works.** Today's capacity is `workers × SHIFT_MINUTES` worker-minutes and `heavyVehicles × SHIFT_MINUTES` vehicle-minutes, taken from today's (UTC) Resource row.
1. Work that is already assigned or in progress is reserved first.
2. Pending, unassigned complaints are taken in order of urgency, then votes, then age, as long as their `requiredWorkers × estimatedTimeMinutes` (and vehicle time) still fits.
3. Everything else is deferred with a reason, such as "Not enough crew time left" or "Needs 5 workers at once; only 4 on duty".

The plan never exceeds capacity. If already-assigned work alone exceeds it, the plan says so in `warnings`.

**Completing a task.** Staff send `PATCH /api/assignments/:id/status` as multipart with `status=COMPLETED`, `verifiedWeightKg`, optional `resolutionNotes`, and the after photo in the `afterImage` field. Tasks only move forward: ASSIGNED, then IN_PROGRESS, then COMPLETED.

## Evaluating the AI

`npm run eval` in `backend/` scores the **real** Gemini duplicate judge and the analysis + priority scorer against hand-labelled rows in [`backend/eval/`](backend/eval/README.md). It reports:
- duplicate precision, recall and F1
- a priority confusion matrix and accuracy
- mean latency per AI call

Results go to `backend/eval/results.json`, which the portal's Analytics page shows as an "Evaluation" card.

- The `[EXAMPLE]` rows only show the format; they are skipped unless you pass `--include-examples`.
- Fewer than 20 evaluated rows is flagged as not statistically meaningful.
- Failed AI calls are reported and left out of the metrics, never counted as predictions. A run with no successful calls doesn't write a results file.
- It needs a working `GEMINI_API_KEY`; the demo cache is never used.

## Security defaults

- **Who can read what.** Citizens can read only their own complaints (others return 404) and never see reporter emails or staff IDs. `/nearby` and `/hotspots` return no user identifiers. Changing or verifying a complaint requires STAFF or ADMIN.
- **Validation.** Every request body is validated with Zod (`backend/src/validation/schemas.ts`). Unknown fields on staff endpoints are rejected.
- **Uploads.** JPEG, PNG or WebP only, at most 5MB. The file's bytes must match its declared type. Files are saved under a random UUID with an extension taken from the type, never from the client's filename.
- **Rate limits** (per IP unless noted, all configurable in `.env`):

  | Scope | Default |
  | --- | --- |
  | All `/api` | 1000 per 15 min |
  | `/api/auth/*` | 10 per 15 min |
  | Creating complaints | 20 per hour per user |

  **For a live demo**, everyone on venue Wi-Fi may share one IP. Raise `AUTH_RATE_LIMIT_MAX` beforehand, and set `TRUST_PROXY=1` if the API runs behind a tunnel.
- **CORS.** Browsers may call the API only from origins listed in `CORS_ORIGINS` (default `http://localhost:5173`). The mobile app is not affected.
- **Errors.** 500 responses carry only a generic message. Details are logged on the server.

## Demo accounts

Created by `npx prisma db seed`. **Demo use only**: anyone reading this file knows these passwords, so never use them on a deployment holding real data.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@civicclean.demo` | `CivicDemo#2026` |
| Staff | `staff1@civicclean.demo`, `staff2@civicclean.demo`, `staff3@civicclean.demo` | `CivicDemo#2026` |
| Citizen | `citizen1@civicclean.demo`, `citizen2@civicclean.demo`, `citizen3@civicclean.demo` | `CivicDemo#2026` |

## Seeded data is simulated

The seed creates 47 complaints across 35 incidents in Lajpat Nagar, South Delhi (approximate locations), including 9 groups of near-duplicate reports, 5 CRITICAL incidents, and 11 resolved complaints with a staff-entered weight and an "after" photo. **All of it is simulated**: the images are labelled placeholders, and the weights and AI outputs are hand-written demo values. These rows have `isSimulated = true`, and any UI that shows them must label them "simulated". Re-running the seed replaces only simulated rows.

The data lives in [`backend/src/demo/demoData.ts`](backend/src/demo/demoData.ts). The same file drives `AI_MODE=cached`, so for an instant live demo, submit one of these near Lajpat Nagar Central Market (about 28.5689, 77.2390):

- *"Bins behind Central Market overflowing again, garbage spread across the lane and dogs everywhere."* is detected as a duplicate of an existing report, and that incident's vote count goes up.
- *"Huge pile of construction rubble dumped overnight in front of the Central Market parking gate, cars cannot get in or out."* is a new CRITICAL report.

Attaching the matching image from `backend/src/uploads/seed/` (`mixed-garbage.png`, `construction-debris.png`) also returns cached image analysis.
