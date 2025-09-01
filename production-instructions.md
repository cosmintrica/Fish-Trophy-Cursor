# Fish Trophy – Production Instructions (Cursor-Ready)

> **Purpose**: Single source of truth for building and shipping the product.  
> **Stack (final)**: **Firebase Auth** • **Neon (PostgreSQL + PostGIS)** • **Drizzle** • **Vercel Functions** • **React + Vite + Tailwind + shadcn/ui + TanStack Query** • **Leaflet** (OSM tiles) • **Resend emails**.  
> **Admin**: 100% **custom**, inside the site (`/admin`), with polygon/point editing (Leaflet.draw), moderation workflow, users, amenities.  
> **Special area**: Dedicated **Black Sea** micro-site with its own theme & defaults.

---

## Project Overview
- Public map with **water bodies** (polygons), **locations** (points), **amenities** (parking, facilities, tackle shops).  
- **Records** (catches) with photos, moderation, and **leaderboards**.  
- **Species** catalogue (real photos, details, habitat flags).  
- **Black Sea** section (`/black-sea`) with light-blue theme and sea-only filters.  
- **Custom Admin** (`/admin`) with: moderation queue; map editing for polygons/points; users & records management; amenities CRUD.  
- Email notifications on approve/reject and when a top record (1–3) is beaten.

---

## Development Phases

### Phase 1: Setup & Foundation (Week 1)
#### 1.1 Tooling
- [ ] Node.js **>= 20.x**, pnpm (sau npm), Git
- [ ] ESLint + Prettier + Husky + lint-staged
- [ ] EditorConfig, TypeScript strict, path aliases `@/*`
- [ ] Vercel project linked to GitHub (Preview deploys on PR)

#### 1.2 Database (Neon + PostGIS) & ORM
- [ ] Creează proiect **Neon** → copiază `DATABASE_URL`
- [ ] Activează extensii:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS postgis_topology;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```
- [ ] Adaugă **Drizzle** (`drizzle-kit`) și configurarea
- [ ] Creează schema (vezi “Database Design”) și rulează:
  ```bash
  pnpm drizzle-kit generate
  pnpm drizzle-kit push
  ```

#### 1.3 Autentificare
- [ ] Creează proiect Firebase + Web App; activează **Email/Parolă** și **Google**
- [ ] Frontend: inițializează Firebase (`VITE_FIREBASE_*`)
- [ ] Server: Firebase Admin în Vercel Functions (verifică ID Token)

#### 1.4 Frontend Foundation
- [ ] Vite + React + Tailwind + shadcn/ui + TanStack Query
- [ ] Router (Wouter/React Router), App shell, layout, theme tokens
- [ ] **Leaflet** baseline (OSM tiles, attribution, CSS, icon fix)

---

### Phase 2: Core Backend (Week 2–3)
#### 2.1 Auth System
- [ ] Flow login/register (Email/Google) cu Firebase
- [ ] `users` în DB (sincron minim) + **custom claims** (`user|moderator|admin`)
- [ ] Middleware în Functions: verifică `Authorization: Bearer <id_token>`

#### 2.2 API (Vercel Functions)
- [ ] **Records**
  - `POST /api/records` – creează **pending**; auto-setează `water_body_id` via `ST_Contains`
  - `GET /api/records` – listă cu filtre (species, bbox, status, date)
  - `PUT /api/records/:id/approve` – admin/mod (trimite email, scrie audit)
  - `PUT /api/records/:id/reject` – admin/mod (motiv obligatoriu, email, audit)
- [ ] **Leaderboards**
  - `GET /api/leaderboard` – top by species/period/area (vezi “Leaderboards”)
- [ ] **Water Bodies**
  - `GET /api/water-bodies` – listare + GeoJSON simplificat/bbox
  - `PUT /api/water-bodies/:id` – update proprietăți + polygon (admin)
- [ ] **Amenities**
  - `POST/GET/PUT/DELETE /api/amenities` – CRUD pe hartă (parking/facilities/shops)
- [ ] **Species**
  - `GET /api/species`, `GET /api/species/:id`
- [ ] **Profile**
  - `PUT /api/profile` – update profil minim (display_name, opt-in emails)

**Validation:** Zod pe toate payload-urile.  
**Security:** Rate-limit pe write; CORS strict; JSON only; tot ce face admin trece prin `audit_logs`.

#### 2.3 Upload Foto
- [ ] Upload direct în **Firebase Storage** (reguli doar pentru user logat)
- [ ] Salvează `photo_url` în `records`
- [ ] (optional) mutare la **Cloudflare Images** ulterior

---

### Phase 3: Frontend Core (Week 4–5)
#### 3.1 Auth UI
- [ ] Modal login/register (Email/Google)  
- [ ] `useAuth()` hook + ProtectedRoute  
- [ ] Toaster + error boundaries

#### 3.2 Harta (Leaflet)
- [ ] OSM tiles + attribution (gratuit)
- [ ] Straturi: **water bodies** (poligoane), **locations** (puncte), **amenities** (puncte)
- [ ] **Popups** water body: top records, specii principale, buton “Adaugă record”
- [ ] BBox fetch (server acceptă `bbox`), paginare server-side

#### 3.3 Navigație & Temă
- [ ] Navbar responsive, footer, layout
- [ ] Theme via CSS variables (Tailwind) — default + **Black Sea** palette
- [ ] Rută: `/black-sea` cu filtrare sea-only + accente blue

---

### Phase 4: Records & Leaderboards (Week 6)
#### 4.1 Submit Record
- [ ] Formular: specie, greutate, lungime, dată/oră, coordonate (picker), foto
- [ ] EXIF (dacă există), debounced reverse-geocode (mai târziu)
- [ ] Submit → `status='pending'` → email de confirmare

#### 4.2 Leaderboards (live)
- [ ] Filtre complexe: specie, regiune/județ, corp de apă, interval timp
- [ ] **Live search** (debounce, fără Enter)
- [ ] TanStack Table + pagination
- [ ] Materialized views / SQL optim pentru top-uri

#### 4.3 Profile
- [ ] Pagină user: statistici, PB-uri, capturi recente
- [ ] Public profile link
- [ ] Preferințe email (approved/rejected, record beaten)

---

### Phase 5: Admin Custom (Week 7)
#### 5.1 Dashboard
- [ ] Coada “Pending records” (card: foto, detalii, mini-map) → Approve/Reject (+motiv) → `audit_logs`
- [ ] Shortcuts: ✔/✖

#### 5.2 Geo Editing
- [ ] `/admin/water-bodies` list + edit view
- [ ] **Leaflet.draw** (create/edit poligoane), validare (fără self-intersections)
- [ ] Save → API → update `water_bodies.geom` (ST_Multi, SRID 4326)

#### 5.3 Users & Amenities
- [ ] Users: schimbă rol (admin/mod), soft suspend
- [ ] Amenities: CRUD pe hartă (parking/facilities/tackle shops), toggle layer

---

### Phase 6: Polish & Launch (Week 8)
- [ ] Sentry FE/BE, error boundaries
- [ ] Lighthouse, bundle splitting, caching TanStack
- [ ] E2E pe fluxuri critice (login, submit, approve, leaderboard)
- [ ] A11y checks
- [ ] Launch runbook & rollback

---

## Technical Implementation

### Repo Structure
```
.
├─ client/                 # React (Vite)
│  ├─ index.html
│  └─ src/
│     ├─ App.tsx
│     ├─ main.tsx
│     ├─ lib/
│     │  ├─ firebase.ts
│     │  ├─ queryClient.ts
│     │  └─ api.ts
│     ├─ components/
│     ├─ pages/
│     │  ├─ home.tsx
│     │  ├─ black-sea.tsx
│     │  ├─ species.tsx
│     │  ├─ leaderboards.tsx
│     │  └── admin/
│     │      ├─ index.tsx
│     │      ├─ records-queue.tsx
│     │      ├─ water-bodies.tsx
│     │      ├─ water-body-edit.tsx
│     │      ├─ amenities.tsx
│     │      └─ users.tsx
│     └─ styles/
├─ api/
│  ├─ _lib/
│  │  ├─ db.ts
│  │  ├─ auth.ts
│  │  ├─ z.ts
│  │  └─ geo.ts
│  ├─ records.ts
│  ├─ records/[id]/approve.ts
│  ├─ records/[id]/reject.ts
│  ├─ leaderboard.ts
│  ├─ water-bodies.ts
│  ├─ water-bodies/[id].ts
│  ├─ amenities.ts
│  ├─ species.ts
│  └─ profile.ts
└─ packages/
   └─ db/
      ├─ schema.ts
      └─ migrations/
```

### Database Design
- Enums: `user_role`, `record_status`, `water_body_type`
- Tables: `users`, `water_bodies`, `locations`, `species`, `records`, `amenities`, `audit_logs`
- Geometry columns as GEOGRAPHY(4326), all with GIST index.
- Auto-assign `water_body_id` on record create with `ST_Contains`.

### API Endpoints
```
POST   /api/records
GET    /api/records
PUT    /api/records/:id/approve
PUT    /api/records/:id/reject
GET    /api/leaderboard
GET    /api/water-bodies
PUT    /api/water-bodies/:id
POST   /api/amenities
GET    /api/amenities
PUT    /api/amenities/:id
DELETE /api/amenities/:id
GET    /api/species
GET    /api/species/:id
PUT    /api/profile
```

### Env Vars
Frontend (`client/.env.local`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=© OpenStreetMap contributors
```

Server (Vercel):
```
DATABASE_URL=postgres://USER:PASSWORD@HOST/db?sslmode=require
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
EMAIL_FROM=noreply@yourdomain.ro
RESEND_API_KEY=...
```

---

## Success Criteria
- Admin poate edita poligoane și modera rapid (audit + emailuri)
- Harta e fluidă cu bbox queries
- Leaderboards răspund în timp real sub filtre
- Black Sea section are temă & filtre dedicate
- 0 erori critice în Sentry pe 7 zile

---

