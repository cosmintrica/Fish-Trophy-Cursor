# Fish Trophy – Production Instructions (Cursor-Ready)

> **Purpose:** This file is the single source of truth for building and shipping the product.  
> **Stack (final):** Supabase Auth • Supabase (PostgreSQL + **PostGIS**) • Supabase Client • **Netlify Functions** • React + Vite + Tailwind + shadcn/ui + TanStack Query • **Leaflet** (OSM tiles) • Cloudflare R2 Storage.  
> **Admin:** 100% **custom**, inside the site (`/admin`), with editing of **polygons/points** (Leaflet.draw), moderation, users, amenities.  
> **Special area:** Dedicated **Black Sea** micro‑site with separate theme and filters.

---

## Project Overview
Build a comprehensive platform for anglers in Romania featuring:
- Public map with **water bodies** (polygons), **locations** (points), **amenities** (parking, facilities, tackle shops).
- **Records** (catches) with photos, moderation, and **leaderboards**.
- **Species** catalogue (real photos, details, habitat flags) with smart filtering (popular species first, full search available).
- **Team Statistics** by water body with comprehensive analytics (total weight, count, species breakdown).
- **Premium Plan** (€2/user) for competitions, prizes, and advanced features.
- **Role-based Access Control** (user/moderator/admin) with secure Supabase RLS policies.
- **Black Sea** dedicated section (`/black-sea`) - admin only, coming soon for users.
- **Custom Admin** (`/admin`) with moderation queue, map editing (polygons & points), users & records management.
- Notifications by email on approve/reject and when a top record (1–3) is beaten.

---

## Development Phases

### Phase 1: Project Setup & Foundation (Week 1) ✅ COMPLETED
#### 1.1 Environment Setup
- [x] Node.js **>= 20.x**, pnpm (or npm), Git
- [x] ESLint + Prettier + Husky + lint-staged
- [x] EditorConfig, TypeScript strict, path aliases (`@/*`)
- [x] Netlify project linked to GitHub (Preview deployments)

#### 1.2 Database (Supabase + PostGIS) & Client
- [x] Create **Supabase** project → get `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] Enable extensions in Supabase (SQL):
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS postgis_topology;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
- [x] Applied comprehensive database schema (`supabase-schema-final.sql`)
- [x] Created all tables, policies, triggers, and functions

#### 1.3 Authentication
- [x] Create Supabase project + enable **Email/Password** + **Google OAuth**
- [x] Frontend: initialize Supabase client (`VITE_SUPABASE_*`)
- [x] Server: setup Supabase Admin in Netlify Functions (read envs, verify JWT token)

#### 1.4 Frontend Foundation
- [x] Vite + React + Tailwind + shadcn/ui + TanStack Query
- [x] Router (React Router). App shell, layout, theme tokens
- [x] **Leaflet** baseline (OSM tiles, attribution, CSS, icon fix)
  - CSS: import `leaflet/dist/leaflet.css`
  - Icon fix (default marker urls) merged at app start

---

### Phase 2: Core Backend Development (Week 2–3) ✅ COMPLETED
#### 2.1 Authentication System
- [x] Supabase Auth flows (register/login with Email & Google)
- [x] Store comprehensive profile in DB (`profiles`) and set **custom role claim** (`user|moderator|admin`)
- [x] Middleware in Netlify Functions: verify `Authorization: Bearer <jwt_token>`
- [x] **Role Management System**
  - [x] Supabase RLS policies for role-based access control
  - [x] Admin functions (`is_admin()`) for secure role checking
  - [x] Role-based access control in database policies
  - [x] User role management via Supabase dashboard

#### 2.2 API Endpoints (Netlify Functions)
- [x] **Records** (Basic CRUD implemented)
  - [x] `POST /api/records` – create **pending** record; auto-assign `water_body_id` with `ST_Contains`
  - [x] `GET /api/records` – list with filters (species, bbox, status, dates)
  - [ ] `PUT /api/records/:id/approve` – admin/mod (email user, write audit)
  - [ ] `PUT /api/records/:id/reject` – admin/mod (reason required, email user, audit)
- [x] **Leaderboards** (Basic implementation)
  - [x] `GET /api/leaderboards` – top by species/period/area
- [ ] **Team Statistics** (NEW)
  - [ ] `GET /api/water-bodies/:id/team-stats` – comprehensive analytics per water body
  - [ ] `GET /api/water-bodies/:id/species-breakdown` – species count/weight per water body
  - [ ] `GET /api/teams` – list of "teams" (users who fished at specific water bodies)
- [ ] **Water Bodies**
  - `GET /api/water-bodies` – list + optional bbox/GeoJSON simplified
  - `PUT /api/water-bodies/:id` – update properties + polygon (admin only)
- [ ] **Amenities**
  - `POST/GET/PUT/DELETE /api/amenities` – CRUD on parking/facilities/shops
- [ ] **Species**
  - `GET /api/species` – with smart filtering (popular first, full search)
  - `GET /api/species/:id`
- [x] **Profile**
  - `PUT /api/profile` – sync display_name, preferences (e.g., email opt-ins)
- [ ] **Premium Features** (Future)
  - `POST /api/subscriptions` – handle €2/month premium subscriptions
  - `GET /api/premium-features` – check user premium status

**Validation:** Zod schemas for all payloads.  
**Security:** Rate-limit write endpoints, CORS strict, JSON only, audit everything admin-side.

#### 2.3 File Uploads (Photos)
- [x] Upload to **Supabase Storage** for avatars and thumbnails
- [x] Upload to **Cloudflare R2** for submission images and videos
- [x] Generate download URL, store in `records.photo_url`
- [x] Hybrid storage strategy: Supabase (small files) + R2 (large content)

---

### Phase 3: Frontend Core Features (Week 4–5) ✅ IN PROGRESS
#### 3.1 Auth Components
- [x] Auth modal (login/register with Email/Google) via Supabase
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
- [x] **Black Sea Access Control**
  - [x] Admin-only access to `/black-sea` route
  - [x] "Coming Soon" message for regular users
  - [x] Move Black Sea to last position in navigation menu
- [x] **Species Smart Filtering**
  - [x] Popular species shown first in record forms
  - [x] Full search functionality for all 270+ species
  - [x] User-friendly dropdown with search capability

---

### Phase 4: User Features & Leaderboards (Week 6) ✅ IN PROGRESS
#### 4.1 Record Submission
- [x] Form with species, weight, length, date/time, coordinates (map picker), photo
- [x] Extract EXIF timestamp (if available), debounced reverse‑geocode (later)
- [x] Submit → `status='pending'` → email confirmation

#### 4.2 Leaderboards (live filters)
- [x] Complex filters: species, region/county, water body, time range
- [x] **Live search** (debounced) — no "Enter" button
- [x] Pagination with TanStack Table
- [x] Materialized view or optimized SQL for top‑N per species/area
- [ ] **Team Statistics Dashboard** (NEW)
  - [ ] Beautiful charts showing total fish caught per water body
  - [ ] Weight totals, species breakdown, team member contributions
  - [ ] Interactive graphs for "Echipa Zaga Zaga" and other water bodies
  - [ ] Automatic team formation based on fishing location

#### 4.3 User Profiles
- [x] Profile page with stats (total records, PBs, last catches)
- [x] Public profile link
- [x] Preferences: email notifications (approved/rejected, record beaten)

---

### Phase 5: Custom Admin Panel (Week 7) 🔄 NEXT
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
- [ ] **Role Management System** (NEW)
  - [ ] Secure role assignment interface (admin only)
  - [ ] Supabase RLS policy management
  - [ ] User role history and audit trail
- [ ] Amenities page: parking/facilities/tackle shops CRUD on map
- [ ] **Premium Subscription Management** (Future)
  - [ ] User subscription status monitoring
  - [ ] Payment processing integration (€2/month)
  - [ ] Revenue tracking for competitions and prizes

---

### Phase 6: Advanced Features & Analytics (Week 8-9)
#### 6.1 Team Statistics & Analytics
- [ ] **Water Body Team Analytics**
  - [ ] Automatic team formation based on fishing location
  - [ ] Comprehensive statistics per water body (total weight, count, species)
  - [ ] Beautiful charts and graphs for team performance
  - [ ] "Echipa Zaga Zaga" and other water body teams
- [ ] **Species Analytics**
  - [ ] Species popularity tracking
  - [ ] Smart species filtering (popular first, full search)
  - [ ] Species distribution across water bodies

#### 6.2 Premium Features Foundation
- [ ] **Subscription System Architecture**
  - [ ] Database schema for premium subscriptions
  - [ ] Payment processing integration (€2/month)
  - [ ] Revenue allocation for competitions and prizes
- [ ] **Premium User Benefits**
  - [ ] Advanced analytics and insights
  - [ ] Priority support
  - [ ] Exclusive competitions and prizes

---

### Phase 7: Polish, Testing & Launch (Week 10)
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
│     │  ├─ supabase.ts        # client SDK
│     │  ├─ queryClient.ts     # TanStack config (attaches JWT token)
│     │  └─ api.ts             # fetch helpers + Zod types
│     ├─ components/           # UI, modals, forms
│     ├─ pages/                # home, black-sea, species, leaderboards, admin/*
│     └─ styles/               # map.css, theme.css
├─ netlify/               # Netlify Functions
│  └─ functions/
│     ├─ _lib/
│     │  ├─ supabase.ts        # server client
│     │  ├─ auth.ts            # verify Supabase JWT token
│     │  ├─ z.ts               # zod schemas
│     │  └─ geo.ts             # bbox helpers, simplification
│     ├─ records.mjs           # GET/POST
│     ├─ records-approve.mjs
│     ├─ records-reject.mjs
│     ├─ water-bodies.mjs
│     ├─ amenities.mjs
│     ├─ species.mjs
│     └─ profile.mjs
├─ supabase-schema-final.sql  # Complete database schema
└─ netlify.toml              # Netlify configuration
```

### Database Design (Supabase/PostgreSQL)
**Enums**
- `user_role`: `user | moderator | admin`
- `record_status`: `pending | approved | rejected`
- `water_body_type`: `river | lake | sea | canal | reservoir | pond | other`

**Tables:** `profiles`, `fish_species`, `fishing_locations`, `location_species`, `records`, `fishing_shops`, `shop_reviews`, `fishing_techniques`, `fishing_regulations`, `user_gear`, `audit_logs`  
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
JOIN fish_species s ON s.id = r.species_id
LEFT JOIN fishing_locations wb ON wb.id = r.location_id
WHERE r.status='approved'
  AND r.captured_at >= NOW() - INTERVAL '365 days'
ORDER BY r.weight_kg DESC
LIMIT 100;
```
Add filters (species, region, county, water body) and paginate.

### Supabase Auth (client & server)
- Client: `getSession()` attached as `Authorization: Bearer <jwt_token>` by `queryClient.ts`.
- Server: `verifyJWT()` in `netlify/functions/_lib/auth.ts` → returns `user` + custom claims (`role`).  
Admin routes require `role in ('moderator','admin')`.

### Email (Supabase Auth)
- Templates: approved, rejected (with note), record beaten (old rank vs new).  
- `SUPABASE_SERVICE_ROLE_KEY` in Netlify env for server-side operations.

### Storage Strategy (Hybrid)
- **Supabase Storage**: Avatars, thumbnails (small files, fast access)
- **Cloudflare R2**: Submission images, videos, static content (large files, cost-effective)
- **Configuration**: `R2_CONFIG` in `client/src/lib/supabase.ts`

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
│   ├── supabase.ts
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
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_R2_ACCOUNT_ID=your-r2-account-id
VITE_R2_ACCESS_KEY_ID=your-r2-access-key
VITE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
VITE_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=© OpenStreetMap contributors
```

**Server (Netlify → Env Vars):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
EMAIL_FROM=noreply@yourdomain.ro
```

---

## Development Workflow (Daily)
1. Pull latest, create feature branch.
2. Implement feature (small PRs), write zod schemas, unit tests if applicable.
3. Test locally (`npm run dev` + `netlify dev` for API).
4. Commit with clear messages; push → Netlify Preview.
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
- Netlify project with Env Vars set for `Production`, `Preview`, `Development`
- CI checks (lint/build/test) on PR
- Run DB migrations on deploy (if using migration step)
- Domain + SSL via Netlify

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
- Supabase (Auth, Database, Storage)
- Netlify Functions, Cloudflare R2
- PostGIS for geospatial operations
