# Fish Trophy – Production Instructions (Cursor-Ready)

> **Purpose:** This file is the single source of truth for building and shipping the product.  
> **Stack (final):** Firebase Auth • Neon (PostgreSQL + **PostGIS**) • Drizzle • **Vercel Functions** • React + Vite + Tailwind + shadcn/ui + TanStack Query • **Leaflet** (OSM tiles) • Resend emails.  
> **Admin:** 100% **custom**, inside the site (`/admin`), with editing of **polygons/points** (Leaflet.draw), moderation, users, amenities.  
> **Special area:** Dedicated **Black Sea** micro‑site with separate theme and filters.

---

## Project Overview
Build a comprehensive platform for anglers in Romania featuring:
- Public map with **water bodies** (polygons), **locations** (points), **amenities** (parking, facilities, tackle shops).
- **Records** (catches) with photos, moderation, and **leaderboards**.
- **Species** catalogue (real photos, details, habitat flags).
- **Black Sea** dedicated section (`/black-sea`) with its own palette and filters.
- **Custom Admin** (`/admin`) with moderation queue, map editing (polygons & points), users & records management.
- Notifications by email on approve/reject and when a top record (1–3) is beaten.

---

## Development Phases

### Phase 1: Project Setup & Foundation (Week 1)
#### 1.1 Environment Setup
- [x] Node.js **>= 20.x**, pnpm (or npm), Git
- [x] ESLint + Prettier + Husky + lint-staged
- [x] EditorConfig, TypeScript strict, path aliases (`@/*`)
- [x] Vercel project linked to GitHub (Preview deployments)

#### 1.2 Database (Neon + PostGIS) & ORM
- [x] Create **Neon** project → get `DATABASE_URL`
- [x] Enable extensions in Neon (SQL):
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS postgis_topology;
  CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid if needed
  ```
- [x] Add **Drizzle** (`drizzle-kit`) config and migrations path
- [x] Create schema (see "Database Design" section) and run:
  ```bash
  pnpm drizzle-kit generate
  pnpm drizzle-kit push
  ```

#### 1.3 Authentication
- [x] Create Firebase project + Web app, enable **Email/Password** + **Google**
- [x] Frontend: initialize Firebase SDK (`VITE_FIREBASE_*`)
- [x] Server: setup Firebase Admin in Vercel Functions (read envs, verify ID token)

#### 1.4 Frontend Foundation
- [x] Vite + React + Tailwind + shadcn/ui + TanStack Query
- [x] Router (Wouter / React Router). App shell, layout, theme tokens
- [x] **Leaflet** baseline (OSM tiles, attribution, CSS, icon fix)
  - CSS: import `leaflet/dist/leaflet.css`
  - Icon fix (default marker urls) merged at app start

---

### Phase 2: Core Backend Development (Week 2–3)
#### 2.1 Authentication System
- [x] Firebase Auth flows (register/login with Email & Google)
- [x] Store minimal profile in DB (`users`) and set **custom role claim** (`user|moderator|admin`)
- [x] Middleware in Vercel Functions: verify `Authorization: Bearer <id_token>`

#### 2.2 API Endpoints (Vercel Functions)
- [ ] **Records**
  - `POST /api/records` – create **pending** record; auto-assign `water_body_id` with `ST_Contains`
  - `GET /api/records` – list with filters (species, bbox, status, dates)
  - `PUT /api/records/:id/approve` – admin/mod (email user, write audit)
  - `PUT /api/records/:id/reject` – admin/mod (reason required, email user, audit)
- [ ] **Leaderboards**
  - `GET /api/leaderboard` – top by species/period/area (see "Leaderboards")
- [ ] **Water Bodies**
  - `GET /api/water-bodies` – list + optional bbox/GeoJSON simplified
  - `PUT /api/water-bodies/:id` – update properties + polygon (admin only)
- [ ] **Amenities**
  - `POST/GET/PUT/DELETE /api/amenities` – CRUD on parking/facilities/shops
- [ ] **Species**
  - `GET /api/species`, `GET /api/species/:id`
- [x] **Profile**
  - `PUT /api/profile` – sync display_name, preferences (e.g., email opt-ins)

**Validation:** Zod schemas for all payloads.  
**Security:** Rate-limit write endpoints, CORS strict, JSON only, audit everything admin-side.

#### 2.3 File Uploads (Photos)
- [ ] Upload to **Firebase Storage** directly from client with rules (auth required)
- [ ] Generate download URL, store in `records.photo_url`
- [ ] (Optional later) move to **Cloudflare Images** for transforms/costs

---

### Phase 3: Frontend Core Features (Week 4–5)
#### 3.1 Auth Components
- [x] Auth modal (login/register with Email/Google) via Firebase
- [x] `useAuth()` hook (states: loading/null/user) + ProtectedRoute
- [x] Toasts & error boundaries

#### 3.2 Interactive Map (Leaflet)
- [x] Base map with OSM tiles + attribution
- [x] **Water bodies** (polygons) layer (GeoJSON)
- [x] **Locations** (points), **Amenities** (points) with toggles
- [x] **Popups** on water body:
  - top records summary
  - main species list
  - "Adaugă record" button (opens form)
- [x] BBox queries: fetch only what's in view (server accepts `bbox`)

#### 3.3 Navigation & Theming
- [x] Responsive navbar, footer, layout
- [x] Theme via CSS variables (Tailwind) — default + **Black Sea** palette
- [x] Route: `/black-sea` with light‑blue accent + preset filters

---

### Phase 4: User Features & Leaderboards (Week 6)
#### 4.1 Record Submission
- [ ] Form with species, weight, length, date/time, coordinates (map picker), photo
- [ ] Extract EXIF timestamp (if available), debounced reverse‑geocode (later)
- [ ] Submit → `status='pending'` → email confirmation

#### 4.2 Leaderboards (live filters)
- [ ] Complex filters: species, region/county, water body, time range
- [ ] **Live search** (debounced) — no "Enter" button
- [ ] Pagination with TanStack Table
- [ ] Materialized view or optimized SQL for top‑N per species/area

#### 4.3 User Profiles
- [x] Profile page with stats (total records, PBs, last catches)
- [x] Public profile link
- [x] Preferences: email notifications (approved/rejected, record beaten)

---

### Phase 5: Custom Admin Panel (Week 7)
#### 5.1 Admin Dashboard
- [ ] Pending records queue (cards: photo, details, mini‑map) → Approve/Reject (+note)
- [ ] Keyboard shortcuts for moderators (✔ / ✖)
- [ ] Writes to `audit_logs`

#### 5.2 Geo Editing
- [ ] `/admin/water-bodies` list + **edit view**
- [ ] Leaflet.draw (create/edit polygons), validation (no self‑intersections)
- [ ] Save polygon → API → update `water_bodies.geom`

#### 5.3 Users & Amenities
- [ ] Users page: change role (admin/mod), soft suspend
- [ ] Amenities page: parking/facilities/tackle shops CRUD on map

---

### Phase 6: Polish, Testing & Launch (Week 8)
- [ ] Sentry FE/BE, error boundaries everywhere
- [ ] Lighthouse, bundle splitting, TanStack Query caching
- [ ] E2E tests for critical API endpoints
- [ ] Accessibility checks
- [ ] Launch runbook & rollback plan

---

## Technical Implementation Details

### Repository Structure
```
.
├─ client/                 # React app (Vite)
│  ├─ index.html
│  └─ src/
│     ├─ App.tsx
│     ├─ main.tsx
│     ├─ lib/
│     │  ├─ firebase.ts        # client SDK
│     │  ├─ queryClient.ts     # TanStack config (attaches ID token)
│     │  └─ api.ts             # fetch helpers + Zod types
│     ├─ components/           # UI, modals, forms
│     ├─ pages/                # home, black-sea, species, leaderboards, admin/*
│     └─ styles/               # map.css, theme.css
├─ api/                    # Vercel Functions
│  ├─ _lib/
│  │  ├─ db.ts             # drizzle client
│  │  ├─ auth.ts           # verify Firebase token (admin claims)
│  │  ├─ z.ts              # zod schemas
│  │  └─ geo.ts            # bbox helpers, simplification
│  ├─ records.ts           # GET/POST
│  ├─ records/[id]/approve.ts
│  ├─ records/[id]/reject.ts
│  ├─ water-bodies.ts
│  ├─ water-bodies/[id].ts
│  ├─ amenities.ts
│  ├─ species.ts
│  └─ profile.ts
└─ packages/
   └─ db/
      ├─ schema.ts         # drizzle schema (tables below)
      └─ migrations/       # drizzle-kit output
```

### Database Design (Drizzle/SQL)
**Enums**
- `user_role`: `user | moderator | admin`
- `record_status`: `pending | approved | rejected`
- `water_body_type`: `river | lake | sea | canal | reservoir | pond | other`

**Tables:** `users`, `water_bodies`, `locations`, `species`, `records`, `amenities`, `audit_logs`  
All geometry columns are **GEOGRAPHY** (4326). Create **GIST** indexes on geom columns.  
Auto-assign `water_body_id` on record create with `ST_Contains`.

### Leaderboards (SQL strategy)
- Precompute with a **materialized view** refreshed periodically, or
- Use indexed queries with window functions for "top N per group".  
Example (conceptual):
```sql
-- Top records by species in a time window
SELECT r.*, s.common_ro, wb.name AS water_body_name
FROM records r
JOIN species s ON s.id = r.species_id
LEFT JOIN water_bodies wb ON wb.id = r.water_body_id
WHERE r.status='approved'
  AND r.captured_at >= NOW() - INTERVAL '365 days'
ORDER BY r.weight_kg DESC
LIMIT 100;
```
Add filters (species, region, county, water body) and paginate.

### Firebase Auth (client & server)
- Client: `getIdToken()` attached as `Authorization: Bearer <token>` by `queryClient.ts`.
- Server: `verifyIdToken()` in `api/_lib/auth.ts` → returns `uid` + custom claims (`role`).  
Admin routes require `role in ('moderator','admin')`.

### Email (Resend)
- Templates: approved, rejected (with note), record beaten (old rank vs new).  
- `EMAIL_FROM`, `RESEND_API_KEY` in Vercel env.

### Leaflet (frontend)
- OSM tiles free: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` + attribution.  
- `leaflet-draw` for edit; ensure map container has height (e.g., `min-height: 480px;`).  
- Icon URL fix:
```ts
import L from "leaflet";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: marker2x, iconUrl: marker1x, shadowUrl: shadow });
```

---

## API Endpoints Structure (final)
```
POST   /api/records                  # create pending (auth)
GET    /api/records                  # list with filters (species, bbox, status, dates)
PUT    /api/records/:id/approve      # admin/mod
PUT    /api/records/:id/reject       # admin/mod

GET    /api/leaderboard              # top by species/period/area (live)

GET    /api/water-bodies             # list (GeoJSON simplified, bbox optional)
PUT    /api/water-bodies/:id         # update polygon & props (admin)

POST   /api/amenities                # create
GET    /api/amenities                # list (bbox optional)
PUT    /api/amenities/:id            # update
DELETE /api/amenities/:id            # delete

GET    /api/species                  # list
GET    /api/species/:id              # details

PUT    /api/profile                  # update minimal profile
```

---

## Frontend Architecture
```
client/src/
├── components/
│   ├── map/
│   │   ├── Map.tsx
│   │   ├── WaterBodiesLayer.tsx
│   │   ├── AmenitiesLayer.tsx
│   │   └── DrawControls.tsx
│   ├── records/
│   ├── species/
│   ├── leaderboards/
│   └── ui/ (shadcn)
├── pages/
│   ├── home.tsx
│   ├── black-sea.tsx            # themed micro-site
│   ├── species.tsx
│   ├── leaderboards.tsx
│   └── admin/
│       ├── index.tsx
│       ├── records-queue.tsx
│       ├── water-bodies.tsx
│       ├── water-body-edit.tsx
│       ├── amenities.tsx
│       └── users.tsx
├── lib/
│   ├── firebase.ts
│   ├── queryClient.ts
│   ├── filters.ts
│   └── theme.ts
└── styles/
    ├── index.css
    └── map.css
```

---

## Environment Configuration
**Frontend (`client/.env.local`):**
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

**Server (Vercel → Env Vars):**
```
DATABASE_URL=postgres://USER:PASSWORD@HOST/db?sslmode=require
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
EMAIL_FROM=noreply@yourdomain.ro
RESEND_API_KEY=...
```

---

## Development Workflow (Daily)
1. Pull latest, create feature branch.
2. Implement feature (small PRs), write zod schemas, unit tests if applicable.
3. Test locally (`pnpm dev` + `vercel dev` for API).
4. Commit with clear messages; push → Vercel Preview.
5. QA on preview; merge to main when green.

### Git Workflow
- Feature branches → PR → Review → Merge (squash or conventional commits)

### Code Quality
- ESLint + Prettier; TypeScript strict
- Keep components focused; hooks for data fetching
- Error boundaries + toasts for UX

---

## Testing Strategy
### Unit
- Helpers, hooks, zod validators

### Integration
- API endpoints (happy paths + auth failures)
- DB interactions (using a test schema)

### E2E (later)
- Critical flows: login, submit record, approve, leaderboard

---

## Deployment Preparation
- Vercel project with Env Vars set for `Production`, `Preview`, `Development`
- CI checks (lint/build/test) on PR
- Run DB migrations on deploy (if using migration step)
- Domain + SSL via Vercel

---

## Success Criteria
- Admin can draw/edit polygons; approve/reject records with audit + emails
- Public map fast with bbox queries
- Leaderboards responsive under filters and live search
- Black Sea section themed and filtered by default
- Sentry shows 0 critical errors over 7 days post-launch

---

## Risk Mitigation
- Large polygons → simplify for map rendering; store original geometry separately if needed
- Image abuse → size limits, type checks, optional moderation queue for images
- Abuse on records → rate limit + anomaly detection (later)

---

## Post-Launch
- Monitor Sentry, logs, DB metrics
- Track usage on leaderboards/map
- Plan next: mobile PWA, offline tiles, advanced species pages

---

## Resources
- React, Vite, Tailwind, shadcn/ui
- Leaflet & Leaflet.draw
- Drizzle ORM, Neon/PostgreSQL/PostGIS
- Firebase Auth (client), Firebase Admin (server)
- Vercel Functions, Resend
