# SwachhLens AI: Operations Portal

React + Vite web portal for municipal staff, backed by the SwachhLens AI API in `../backend`.

- **Administrators:** dashboard, urgency-ranked complaint list, complaint detail (AI analysis, priority reasons and override, duplicate confirm/dismiss, assignment, event timeline), map with hotspots, today's plan, staff workload, analytics, CSV export.
- **Field staff:** a phone-friendly "My tasks" page to start work and complete it with an after photo and the weighed amount.

All data comes from the API. There are no mock numbers; seeded demo records are labelled "Simulated".

## Run

```sh
npm install
```

```sh
npm run dev
```

The portal opens at http://localhost:5173 and talks to `http://localhost:5000/api` by default. To use another backend, create `.env.local`:

```
VITE_API_URL=http://192.168.1.42:5000/api
```

The backend must allow the portal's origin in `CORS_ORIGINS`. Production build: `npm run build`.

See the [root README](../README.md) for setup, demo accounts and architecture.
