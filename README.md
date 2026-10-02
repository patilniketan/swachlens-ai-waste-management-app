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
