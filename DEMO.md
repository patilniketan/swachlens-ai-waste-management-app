# SwachhLens AI: 4–5 minute demo script

**Legend**
- **LIVE**: a real request handled during the demo.
- **PRECOMPUTED**: seeded data or stored answers prepared beforehand.

Say which is which out loud: the seeded complaints are simulated and labelled "Simulated" on screen.

## Before the demo (T–30 min)

1. **Backend `.env`:**
   - `AI_MODE=cached` and `DEMO_MODE=true`.
   - `AUTH_RATE_LIMIT_MAX=50`, because everyone on venue Wi-Fi may share one IP.
   - `CORS_ORIGINS=http://localhost:5173`.
   - If Gemini works (`npm run gemini:smoke` prints OK), you may use `AI_MODE=live`. The rehearsed sentences then go to Gemini too, and the results may differ from this script.
2. **Reset the data** (see [Resetting after a rehearsal](#resetting-after-a-rehearsal)), then run `npx prisma db seed`.
3. **Start the backend** with `npx tsx server.ts`. Wait for `Database connections ready`, then open http://localhost:5000/api/health.
4. **Start the portal** with `npm run dev` in `WebPortal/`.
   - **Window A** (normal): sign in as `admin@swachhlens.demo`.
   - **Window B** (private/incognito): sign in as `staff1@swachhlens.demo`.
   - The password for both is `SwachhDemo#2026`. Open each page once so database connections are warm.
5. **Phone** (Android build of `MobileApp/`). In [`config.ts`](MobileApp/src/constants/config.ts) set:
   - `API_HOST_OVERRIDE = 'http://<laptop-LAN-IP>:5000'`
   - `DEMO_LOCATION_OVERRIDE = { latitude: 28.5689, longitude: 77.239 }` (Central Market, Lajpat Nagar). The app shows "Demo location in use"; say so.
   - Then:
     - Rebuild.
     - Sign in as `citizen1@swachhlens.demo`.
     - Open `http://<laptop-LAN-IP>:5000/api/health` in the phone's browser to prove it can reach the laptop.
6. **Put this sentence in the phone's clipboard or notes.** It is the rehearsed input; paste it exactly:
   > Bins behind Central Market overflowing again, garbage spread across the lane and dogs everywhere.
7. Keep `backend/src/uploads/seed/after-clean-1.png` handy on the laptop for the staff "after" photo, or use a real photo.

## The script

| Time | Step | Live? |
| --- | --- | --- |
| 0:00 | **Ranked list.** Window A → **Complaints** (sorted "Most urgent first"). Point at the CRITICAL rows (e.g. *biomedical waste outside a clinic, 8/10*) and the "Simulated" and "AI" chips. "The AI only describes the scene; fixed rules set the priority, and every point is explained." | PRECOMPUTED (seed) |
| 0:35 | **Map.** Open **Map**: priority-coloured markers and 500 m hotspot circles over Lajpat Nagar. Hover a hotspot: complaint and report counts, plus how many are simulated. | PRECOMPUTED (seed) |
| 1:00 | **Citizen report.** On the phone: **Report Waste** → take any photo → paste the sentence → address "Central Market back lane" → **Submit**. | LIVE request |
| 1:20 | **AI result screen** on the phone: waste type, amount, hazard flag, priority with its reasons, and the note *"A similar report exists nearby; staff will review."* With `AI_MODE=cached`, the analysis of this rehearsed sentence is a stored answer; say so. | LIVE request, cached AI answer |
| 1:50 | **New report reaches staff.** Window A → **Complaints** → switch to "Newest first". The report appears within 10 s (auto-refresh). Open it: photo, mini-map, **AI analysis** card and **Possible duplicate** card pointing at CM-BINS. | LIVE |
| 2:15 | **Confirm duplicate.** Click **Confirm duplicate**. The page now says "Linked as a duplicate of CM-BINS". Click CM-BINS: **Reported by 4 citizens**, and the priority card has re-scored ("+1 reported by 4 citizens"). Nothing merged until a human confirmed. | LIVE |
| 2:45 | **Assign.** On CM-BINS: **Assign to** → staff1 → **Assign**. The **Timeline** shows "Assigned to staff1" and "Pending → Assigned". | LIVE |
| 3:05 | **Staff completes.** Window B (staff1, "My tasks", phone-sized layout) → CM-BINS → **Start** → **Complete with after photo**: choose the after photo, weight **60** kg, note "Bins emptied, lane swept" → **Mark completed**. | LIVE |
| 3:40 | **Proof for the admin.** Window A → refresh CM-BINS: **Resolved**, the *Resolution evidence* card (after photo, 60 kg, notes) and the full timeline with who did what. | LIVE |
| 4:00 | **AI estimate vs weighed reality.** Window A → **Analytics**. The table compares the AI's *relative volume* (it never guesses kg) with what staff weighed; the "Large" row now includes today's 60 kg. Say clearly: "Most rows here are simulated seed data; *Real reports only* shows just today's." Toggle it to show that. | LIVE aggregate over mostly PRECOMPUTED data |
| 4:30 | **Export.** Click **Export CSV** and open it: one row per complaint, an `isSimulated` column, and no personal emails. | LIVE |

Optional, if there's time: **Today's plan → Generate plan** shows the day filled within crew and vehicle minutes, with a reason for every deferral.

## Failure playbook

| Symptom | Fix |
| --- | --- |
| Gemini down, slow, or no key | Set `AI_MODE=cached` and restart the backend. The rehearsed sentences get stored answers instantly. Any other text is saved with "AI fallback / needs review", which is honest and still demoable. |
| Phone can't reach the backend | Same Wi-Fi network? Use the laptop's LAN IP in `API_HOST_OVERRIDE`; test `http://<IP>:5000/api/health` in the phone's browser; allow Node.js through the Windows firewall on *Private* networks. |
| Venue Wi-Fi blocks devices from seeing each other | Put the laptop on the phone's hotspot (or the reverse) and use the new LAN IP. Or connect over USB: `adb reverse tcp:5000 tcp:5000` and set `API_HOST_OVERRIDE` to `'http://localhost:5000'`. |
| Need a public URL | Run a tunnel, e.g. `cloudflared tunnel --url http://localhost:5000`. Set `TRUST_PROXY=1` and use the https URL in `API_HOST_OVERRIDE` (no cleartext-HTTP issue). |
| The phone app won't build or run | Submit the same report from the laptop (see [Fallback: submit without the app](#fallback-submit-without-the-app)). Steps 1:50 onward are unchanged. |
| No "Possible duplicate" appears | 1. The sentence must match exactly (paste it). 2. The location must be within 500 m of Central Market (check `DEMO_LOCATION_OVERRIDE`). 3. CM-BINS must still be open: if a rehearsal linked or resolved it, reset the data. |
| Login says "Too many sign-in attempts" | Raise `AUTH_RATE_LIMIT_MAX` and restart the backend; counters are in memory and reset on restart. |
| "File too large" / "not a valid image" | The app resizes photos to 1600 px. For the staff after photo use a JPEG/PNG under 5 MB. |
| First page load is slow | The remote database is waking up or connecting (Neon: about 2 s per new connection). Open every page once before the demo; wait for `Database connections ready`. |
| Portal shows "Couldn't refresh" | Backend down or restarting: check its terminal. The page recovers on the next 10 s poll. |
| Bounced to the login page | The session ended (token expired or 401). Sign in again. |
| Map tiles are blank | OpenStreetMap tiles need internet. Markers and the list still work; say so. |
| Numbers look wrong / leftovers from a rehearsal | Reset the data (below) and run `npx prisma db seed`. |

## Fallback: submit without the app

From `backend/`, sign in as citizen1 and submit the rehearsed report with a seed photo:

```sh
TOKEN=$(curl -s -H "Content-Type: application/json" -d '{"email":"citizen1@swachhlens.demo","password":"SwachhDemo#2026"}' http://localhost:5000/api/auth/login | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(JSON.parse(s).data.token))")
```

```sh
curl -s -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(node -e "console.log(crypto.randomUUID())")" -F "description=Bins behind Central Market overflowing again, garbage spread across the lane and dogs everywhere." -F "address=Central Market back lane" -F latitude=28.5689 -F longitude=77.239 -F "image=@src/uploads/seed/mixed-garbage.png" http://localhost:5000/api/complaints
```

The JSON response shows the same AI result and `duplicateSuggestion` the phone would show.

## Resetting after a rehearsal

`npx prisma db seed` restores all simulated data (including CM-BINS) and the demo accounts. Reports created *during* rehearsal are real rows, so the seed leaves them alone. Remove them first in the database's SQL editor (Neon console, `psql`, or `npx prisma studio`):

```sql
DELETE FROM "ComplaintEvent" WHERE "complaintId" IN (SELECT id FROM "Complaint" WHERE NOT "isSimulated");
DELETE FROM "ComplaintLink" WHERE "linkedComplaintId" IN (SELECT id FROM "Complaint" WHERE NOT "isSimulated") OR "masterComplaintId" IN (SELECT id FROM "Complaint" WHERE NOT "isSimulated");
DELETE FROM "Assignment" WHERE "complaintId" IN (SELECT id FROM "Complaint" WHERE NOT "isSimulated");
UPDATE "Complaint" SET "masterComplaintId" = NULL WHERE "masterComplaintId" IN (SELECT id FROM "Complaint" WHERE NOT "isSimulated");
DELETE FROM "Complaint" WHERE NOT "isSimulated";
```

Then run `npx prisma db seed`. Photos uploaded during rehearsal stay in `backend/src/uploads/` (git-ignored); delete them if you like. Keep the `seed/` folder.
