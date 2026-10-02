# Corrections for "THE_EYE DOCUMENTATION.pdf"

The PDF was **not** edited. Each row below is a claim in it that is false, unsupported by the code, or out of date, with a corrected statement you can paste in. Page numbers refer to the PDF.

**Status**
- **False:** the code does something different.
- **Unsupported:** no measurement or data backs it.
- **Outdated:** it was true of an earlier version, or the details changed.
- **Partly true:** the gist holds, the specifics don't.

The code was checked as of commit `65e4cc2` plus the Phase 9 changes.

The name is now **SwachhLens AI** everywhere, matching the PDF; the code previously said "CivicClean".

## 1. Executive summary (pp. 3–4)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 1 | 3 | "AI Classification Accuracy 82%" | Unsupported | Not yet measured. `npm run eval` scores the AI against a hand-labelled set; no labelled data has been evaluated yet. |
| 2 | 3 | "Duplicate Detection Rate 89%" | Unsupported | Not yet measured; the evaluation harness reports precision, recall and F1 once labelled pairs exist. |
| 3 | 3 | "Complaint Resolution Time — Reduced by estimated 40%" | Unsupported | No baseline or pilot data exists. Remove, or present it as a hypothesis to test in a pilot. |
| 4 | 4 | "Citizen Reporting Time — Under 2 minutes" | Unsupported | Not measured. |
| 5 | 4 | "Dashboard Load Time — Less than 2 seconds" | Unsupported | Not benchmarked. Observed in development: a complaint detail loads in about 1 s once database connections are warm (remote Neon database); the first load after idle can take several seconds. |
| 6 | 3 | "Full mobile app + web dashboard working" | Partly true | The web portal works against the live API. The mobile app's code type-checks and its Jest tests pass, but the `android/` project must be regenerated and the app was not run on a device during development; iOS is untested. |
| 7 | 3 | "Ready to handle thousands of complaints" | Unsupported | No load testing was done. |
| 8 | 3 | "Semantic duplicate detection (nobody does this)" | Unsupported | Remove the superlative: "An AI judges whether nearby reports describe the same problem; staff confirm before anything is linked." |

## 2–3. Problem, solution and USP (pp. 4–7)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 9 | 4, 7 | "Track complaint status in real-time" / "Real-time status — Updates instantly" | False | There is no real-time push. The app refreshes when a screen opens; the portal polls every 10 s. |
| 10 | 4 | "AI detects if similar complaint exists within 500m radius" | Partly true | Up to 5 active reports within 500 m are judged by the AI, which only *suggests* a duplicate; staff confirm or dismiss it. |
| 11 | 4 | "AI estimates quantity → urgent vs routine waste" | Outdated | The AI describes the scene (waste type, relative volume Small–Massive, hazards, blocked road, nearby school/hospital/market). Fixed rules turn that into a priority and record the reasons. |
| 12 | 5 | "Staff dashboard with drag-and-drop assignment" | False | Admins assign from the complaint detail page using a staff dropdown. |
| 13 | 5 | Example: "85% similar — same issue! Merge them" | False | There is no similarity percentage and no automatic merge. The AI answers yes, no or unsure, and staff confirm. |
| 14 | 5 | "Reduces workload by approximately 40%" | Unsupported | Remove. |
| 15 | 5–6 | "The Verification Loop (Self-Improving AI)… AI estimates ~15 kg… system learns… gets SMARTER over time" | False | The AI never estimates kilograms and nothing is learned or fed back to it. When staff complete a job they record the weighed kg and an after photo, and the Analytics page compares the AI's *relative volume* with those weights for humans to review. |
| 16 | 6 | "TOTAL Less than 17 seconds" | Unsupported | Not measured, and it excludes network and AI time. |
| 17 | 6 | "Connaught Place has 50 complaints → Hotspot detected → Send extra staff" | Partly true | Hotspots are 500 m clusters of active complaints, scored by priority and votes and shown on the map. Nothing is dispatched automatically; the daily plan schedules work within crew capacity. |
| 18 | 7 | "Citizen mobile app — Working on iOS/Android" | False (unverified) | See #6. |
| 19 | 7 | "Municipal web dashboard — Live with real data" | Partly true | It reads the live database, but the demo database is mostly simulated seed data, labelled "Simulated" in the UI. |
| 20 | 7 | "Authentication — JWT + OTP working" | Partly true | JWT login works. Email OTP is enforced only when `DEMO_MODE=false`; the demo runs with `DEMO_MODE=true`. |
| 21 | 7 | "Production-Ready, Not Just a Demo" | Unsupported | It is a working prototype. It is not deployed; photos are stored on local disk; rate limits are in memory; the Gemini integration has not been verified with a live key in development. |

## 4. Architecture and data flow (pp. 8–9)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 22 | 8 | "Sends to AI for analysis (async)… Returns Success" | False | The analysis and duplicate checks run *during* the request, in parallel with an 8 s timeout each. The complaint is saved with the results, and the response includes the AI result. |
| 23 | 9 | "If duplicate found → citizen is notified" | Partly true | The suggestion is shown on the app's result screen right after submitting; there is no later notification. |
| 24 | 9 | "System compares AI estimate vs actual weight" | Partly true | Staff record the weighed kg when completing a task, and Analytics groups those weights by the AI's relative-volume label. There is no AI weight estimate to compare against. |

## 5. Technology stack (pp. 9–11)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 25 | 10 | Version table | Outdated | **Mobile:** React Native 0.87.0, bare React Native CLI (**not Expo**), React 19.2.3, TypeScript 6.0.3. **Portal:** React 18.3.1, Vite 6.4, TypeScript 5.9, Recharts 2.15.4, Framer Motion 11.18.2, Lucide 0.468.0, Axios 1.19.0, Leaflet 1.9.4. **Backend:** Express 5.2.1, TypeScript 7.0.2, Prisma 7.9.1, Zod 4.4.3, Helmet 8.3.0, cors 2.8.6, express-rate-limit 8.7.0, bcryptjs 3.0.3, Nodemailer 9.0.5, `@google/genai` 2.17.1. **Platform:** Node.js ≥ 22.11; PostgreSQL 15+ (developed on 18 and Neon). **AI model:** set by `GEMINI_MODEL`, default `gemini-3.6-flash`; this id has not been verified against the live API yet. |
| 26 | 11 | Gemini is "approximately 50% less than GPT-4" | Unsupported | Remove, or cite current published prices with a date. |
| 27 | 11 | Gemini "approximately 1.8 seconds average response" | Unsupported | Not measured; `npm run eval` reports mean latency once run with a key. |
| 28 | 11 | PostgreSQL chosen for "Location queries" | Partly true | No PostGIS: nearby lookups use a SQL bounding box plus distance calculations in the app. |

## 6. Database design (pp. 11–12)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 29 | 11 | Users have `full_name`, phone | False | Users store email, password hash, role, verification flag, and OTP hash/expiry/attempts. There is no name or phone. |
| 30 | 11 | Complaint fields `ai_category, ai_quantity, ai_confidence, verified_volume_cbm, duplicate_of_id` | Outdated | AI fields: `aiWasteCategories`, `aiRelativeVolume` (no kg), `aiImageConfidence` (0–1), hazard/road/sensitive-site flags, `aiSummary`, `aiSource`, `needsManualReview`, `priorityReasons`. Resolution: `verifiedWeightKg`, `afterImageUrl`, `resolutionNotes`, `resolvedAt`. Duplicates: `duplicateSuggestionOfId` plus `masterComplaintId`. There is no volume in m³. |
| 31 | 12 | "OTPs" table | False | The OTP hash is stored on the User row. |
| 32 | 12 | "Analytics (Auto-generated)" table | False | Analytics are computed live from complaints and events; there is no analytics table. |
| 33 | 12 | (Missing) | Outdated | Add: `ComplaintEvent` (audit trail), `ComplaintLink` (confirmed duplicates), and `Resource` (daily crew and vehicles plus the stored daily plan). |
| 34 | 12 | "Complaint (1) → (1) Assignment" | False | One-to-many, with at most one open assignment at a time. |
| 35 | 12 | "Complaint (1) → (1) Complaint for duplicates" | Partly true | Many reports can be linked to one original ("master") complaint. |

## 7. API documentation (pp. 12–17)

All paths are under `/api`, and everything except signup, login and OTP needs `Authorization: Bearer <token>`.

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 36 | 12–13 | Signup takes `fullName`, `phoneNumber`; returns `userId`, `requiresOTP` | False | Body: `{ email, password }` (password ≥ 6 characters). Returns `{ requiresVerification, message }` (plus `user` in demo mode). |
| 37 | 13–14 | Login returns `accessToken` and `fullName` | False | Returns `{ token, user: { id, email, role } }`. |
| 38 | 14–15 | `POST /complaints` returns `{ complaintId, status: "PENDING" }` | False | Multipart `description`, `latitude`, `longitude`, optional `address` and `image`, and an optional `Idempotency-Key` header. Returns `{ complaint, ai, duplicateSuggestion, idempotentReplay }`; statuses are `Pending`, `Assigned`, `InProgress`, `Resolved`, `Linked`, `Merged`, `Rejected`. |
| 39 | 15 | `GET /complaints/nearby` returns `nearbyComplaints`, `totalNearby`, `distance` | False | Returns an array of public complaint fields (no reporter identity) with `distanceMeters` and `distanceKm`. `radius` is in metres. |
| 40 | 15–16 | `POST /complaints/:id/verify` with weight/volume/notes resolves the complaint and returns `aiAccuracy.weightAccuracy: 85.7` | False | `verify` takes no body and only records who verified it and when. Completion is `PATCH /api/assignments/:id/status` (multipart: `status=COMPLETED`, `verifiedWeightKg`, `resolutionNotes`, `afterImage`). No "AI accuracy" figure is computed. |
| 41 | 16–17 | `GET /analytics/dashboard` with totals 1250 / 83.6% / 18.4 h and named hotspot areas | False | Real endpoints: `GET /api/admin/dashboard` (status counts) and `GET /api/admin/analytics` (live aggregates). The sample numbers are invented and must not be presented as results. Hotspots have no area names. |

## 8. AI integration (pp. 17–20)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 42 | 17 | Gemini does classification, quantity estimation and duplicate detection | Partly true | Two calls per report: one combined photo+text analysis (structured output) and, only if there are nearby active reports, one duplicate judgment. There is no quantity in kg. |
| 43 | 18 | Gemini analyses "Location context" | False | The analysis sees the photo and description; the duplicate check sees the distances between reports. |
| 44 | 18–19 | Returns `{ wasteCategory, estimatedQuantity: 15.5 (kg), confidence: 85 }` | Outdated | Returns waste categories, waste type, relative volume, condition, hazards, accessibility, equipment, blocked road, sensitive site, a ≤ 40-word summary and confidence (0–1). It is told never to estimate kg. |
| 45 | 19 | Duplicate prompt returns `similarityScore` 0–100; "If similarityScore > 70, mark as duplicate" | False | It returns `sameIssue: yes / no / unsure` with a reason for each candidate. There is no threshold and nothing is marked automatically; staff confirm or dismiss the suggestion. |
| 46 | 20 | Accuracy table: 82%, 68%, 89%, 76%, 1.8 s | Unsupported | Replace with: "To be measured with `npm run eval` on a hand-labelled set (at least 20 rows); not yet measured." |

## 9. Security & compliance (pp. 20–21)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 47 | 20 | "JWT Tokens expire after 24 hours" | False | Tokens expire after 7 days. |
| 48 | 20 | "OTP Verification required for account activation" | Partly true | Only when `DEMO_MODE=false`. OTPs are random, HMAC-hashed, and allow 5 attempts. |
| 49 | 20 | "Rate Limiting: Max 100 requests per IP per 15 minutes" | Partly true | Configurable defaults: 1000 per IP per 15 min on all `/api`, 10 per IP per 15 min on `/api/auth/*`, and 20 new complaints per user per hour. |
| 50 | 20 | "Zod checks all incoming data" | Partly true | All request bodies, and the admin list and analytics query parameters, are validated with Zod 4; route IDs are not. |
| 51 | 20 | "CORS — only allows specific domains" | Partly true | Browsers are limited to origins in `CORS_ORIGINS`; native apps and server-to-server calls are not affected by CORS. |
| 52 | 20–21 | `saltRounds = 10` | Partly true | Signup hashes with cost 12; the demo seed uses 10. |
| 53 | 21 | GDPR checklist (right to access, right to erasure, anonymisation, 1-year retention) | False | No account deletion, data export, anonymisation pipeline or retention job exists. What is true: no name or phone is collected; citizens see only their own complaints; the CSV export contains no emails. Remove the "compliance" claim or list only these. |

## 10. How to run (pp. 21–23)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 54 | 21 | Node.js v18+ | Outdated | Node.js 22.11 or newer. |
| 55 | 22 | `npx prisma migrate dev --name init` | Outdated | Migrations are committed: `npx prisma migrate deploy`, then `npx prisma db seed`. |
| 56 | 22 | Mobile: "Expo will open — scan QR code with Expo Go" | False | Not an Expo app. Regenerate `android/` (see `MobileApp/README.md`), then `npm start` (Metro) and `npm run android`. |
| 57 | 22–23 | Portal: `npm start`, "Runs on http://localhost:3000" | False | `npm run dev`, which serves http://localhost:5173. |
| 58 | 23 | Default logins `citizen@example.com / Citizen123`, `staff@example.com / Staff123` | False | Demo accounts (admin, staff1–3, citizen1–3 `@swachhlens.demo`) and their password are listed in the root README. |

## 11. Testing (pp. 23–25)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 59 | 23 | Unit tests (Jest), integration tests, "Beta testing with 10 users" | Unsupported | The mobile app has 13 Jest tests. The backend has no automated test suite; it was verified with scripted API calls during development. No user testing took place. |
| 60 | 24 | "Gemini responds within 5 seconds" | Unsupported | Gemini was not called successfully during development (no key). Each AI call has an 8 s timeout. |
| 61 | 24 | "Duplicate detection threshold works" | False | There is no threshold (see #45). |
| 62 | 25 | Pass rates 95% / 98% / 90% / 92% / 100% / 100% | Unsupported | Remove. |
| 63 | 25 | "GPS sometimes inaccurate (added manual entry)" | Partly true | Users can type an address; coordinates come from GPS and cannot be edited by users. |

## 12–13. Impact and costs (pp. 25–28)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 64 | 25 | "Save staff time (40% less duplicate checking)" | Unsupported | Remove. |
| 65 | 26 | Measurable-impact table (48 h → 18 h, 30% → 5%, 40% → 80%, 10 → 16/day, 15 → 5/month) | Unsupported | No baseline or pilot data. Remove, or relabel as hypotheses to test. |
| 66 | 26–27 | "Gemini 1.5 Pro Pricing" and per-token/per-image prices | Outdated | The code uses the model in `GEMINI_MODEL` (default `gemini-3.6-flash`), not 1.5 Pro. Look up current pricing for that model and date the figures. |
| 67 | 27 | Per complaint: image analysis + text processing + duplicate detection | Outdated | One combined analysis call, plus one duplicate call only when there are nearby active reports. Rehearsed demo inputs with `AI_MODE=cached` make no AI calls. |
| 68 | 27 | Infrastructure $45/month, total $85/month | Unsupported | Label these as rough estimates with assumptions; nothing is deployed. |
| 69 | 27–28 | "Traditional system cost $5 per complaint… 99% reduction" | Unsupported | Remove. |

## 15–16. Challenges and conclusion (pp. 29–30)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 70 | 29 | "Set threshold at 70% similarity, staff can override" | False | There is no threshold; staff confirm or dismiss every suggestion. |
| 71 | 29 | "Compressed images to < 1MB before upload" | Partly true | The app resizes photos to at most 1600 px at JPEG quality 0.7, usually a few hundred KB but not guaranteed under 1 MB. The server rejects anything over 5 MB. |
| 72 | 29 | "Added pagination and caching" | Partly true | The admin complaint list is paginated. There is no caching layer beyond Express's standard HTTP revalidation. |
| 73 | 30 | "an AI that understands garbage complaints better than humans… clean up 40% faster" | Unsupported | Remove, e.g. "an AI that describes each report so staff can triage faster, with every priority decision explained." |
| 74 | 30 | "A platform that gets smarter over time" | False | See #15: nothing is learned automatically. |
| 75 | 30 | "Ready to deploy in any city, anywhere in the world" | Unsupported | English only, no deployment configuration, local photo storage. |
| 76 | 29–30 | "Production-ready" (criteria table) | Unsupported | See #21. |

## Appendices (pp. 30–31)

| # | Page | Claim | Status | Corrected statement |
| --- | --- | --- | --- | --- |
| 77 | 30 | `EMAIL_PASS` | False | It is `EMAIL_PASSWORD`. The full list (22 backend variables) is in the root README and `backend/.env.example`. |
| 78 | 31 | `REACT_APP_API_URL="http://localhost:5000"` | False | The portal uses `VITE_API_URL` including `/api` (e.g. `http://localhost:5000/api`), set in `WebPortal/.env.local`. |
| 79 | 31 | `REACT_APP_MAPS_API_KEY` | False | The portal uses OpenStreetMap through Leaflet (no key). The Android app's map needs a Google Maps key in `AndroidManifest.xml`. |
| 80 | 31 | `npm run migrate`; Mobile `npm start # Start Expo`; Web `npm start` | False | Use `npx prisma migrate deploy` (or `npm run prisma:migrate` for development migrations). Mobile `npm start` starts Metro, not Expo. Web is `npm run dev`. |

## Claims that hold (for reference)

- Gemini analyses the photo and text together and returns validated structured JSON.
- Duplicates are searched within 500 m.
- Passwords are bcrypt-hashed.
- Helmet security headers are set.
- Prisma parameterises queries.
- Citizens see only their own complaints.
- Hotspots and a map exist.
- Recharts charts use live data.
- If the AI fails, the complaint is flagged for manual staff review.
- "Recycling marketplace" correctly appears only under *Future scope*.
