# Fish Trophy

Platformă pentru pescarii din România: hartă interactivă, recorduri, specii și comunitate.

## Caracteristici

- Hărți interactive cu locații (puncte) și ape (poligoane)
- Sistem de recorduri cu moderare și leaderboard
- Catalog de specii (detalii, habitat, filtrare)
- Secțiunea Marea Neagră (temă dedicată și preseturi)
- Admin (moderare și management conținut)

## Tech Stack

- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- API: Netlify Functions (catch‑all „/api”) pentru dev/local
- Date: Supabase (Auth/Storage) + Cloudflare R2 (media grea)
- Hărți: MapLibre GL + OSM tiles

## Cerințe

- Node.js 20.x
- Netlify CLI (opțional pentru `netlify dev`)

## Setup Rapid

1. Copiază variabilele de mediu

   - `cp client/env.example client/.env.local`
   - Completează `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` pentru autentificare reală.
   - În lipsa lor, aplicația pornește cu un „stub” sigur (fără Auth/DB), util pentru UI dev.

2. Rulează în dev

   - Doar frontend: `npm run dev:client` (Vite)
   - Frontend + API local: `npm run dev` (Netlify dev, redirecționează „/api/*” la funcția catch‑all).

3. Build

   - `npm run build` (build client în `client/dist`)

## API Dev (Netlify Functions)

- Redirect `"/api/*" -> "/.netlify/functions/:splat"` definit în `netlify.toml`.
- Funcția `netlify/functions/api.mjs` acoperă minimul pentru:
  - `GET/PUT /users/:id/profile`
  - `GET /users/:id/records`
  - `POST /records`, `PUT /records/:id`, `DELETE /records/:id`
  - Returnează date în memorie (doar pentru local/dev).

## Notițe Securitate

- Cheile reale Supabase NU mai sunt în cod. Folosește doar env (`client/.env.local`).
- Configul Cloudflare R2 este doar din env (vezi cheile `VITE_R2_*`).

## Probleme cunoscute / lucru în curs

- Optimizări performanță hărți și marcaje pe mobil.
- Ajustări UX la căutare și popup‑uri.

---

Construit pentru comunitatea pescarilor din România.
