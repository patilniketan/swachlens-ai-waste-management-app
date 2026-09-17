# CivicClean Web Portal

Frontend-only reporting and operations portal for a civic waste-management platform. It provides an operational dashboard, complaint workflow, location view, staff/task overview, analytics, profile, and settings screens.

## Run locally

```bash
npm install
npm run dev
```

Create a production bundle with `npm run build`.

## Technology

React, TypeScript, Vite, React Router, Tailwind CSS (configured for future utility use), Lucide icons, Framer Motion, Recharts, Axios, and Leaflet dependencies for a future live map implementation.

## Structure

- `src/App.tsx` — routed UI and reusable portal view components
- `src/index.css` and `src/constants/theme.ts` — central visual system and responsive layout
- `src/types` — shared backend-compatible domain types
- `src/api` — intentionally unconnected REST service contracts
- `src/mocks/portalData.ts` — **development-preview data only**, completely isolated from UI/API services
- `src/routes/ProtectedRoute.tsx` — authentication integration seam

## Connecting the existing backend

Set `VITE_API_URL` to the backend API base URL, implement the request functions in `src/api`, and replace data imports from `src/mocks/portalData.ts` with hooks/services that call those functions. No backend, database, fake server, secrets, or credentials are included in this project.
