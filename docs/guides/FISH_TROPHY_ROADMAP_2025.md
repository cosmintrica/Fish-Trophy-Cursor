## Fish Trophy – Roadmap & Implementation Plan (2025)

Acest document sintetizează planul etapizat pe sesiuni și pașii tehnici de implementare pentru Fish Trophy.

---

## 1. Sesiuni de lucru – „Fish Trophy - Systematic Fixes”

### Session 1 – R2 Upload Fix 🔴 CRITICAL (≈45 min)

- **Obiectiv**: Repararea completă a încărcării fișierelor în Cloudflare R2.
- **Pași**:
  - Analiză `netlify/functions/upload.mjs` (implementarea curentă).
  - Instalare parser multipart robust (ex: **Busboy**).
  - Rescriere logică de upload (parsat form‑data corect, extras buffer și meta‑date).
  - Test upload **imagine**.
  - Test upload **video**.
  - Stop pentru testare manuală de către utilizator.

### Session 2 – Quick Wins: Map & UI (≈30 min)

- **Obiectiv**: Fixuri rapide pentru hartă și UI.
- **Pași**:
  - Rezolvare bug **marker locație utilizator** (poziționare corectă după animații / flyTo) în `Home.tsx`.
  - Rezolvare **dropdown z‑index** (Records page – Select / Radix UI care cade sub tabel).
  - Test ambele fixuri (desktop + mobil).
  - Stop pentru review de către utilizator.

### Session 3 – Public Profile Redesign (≈2 h)

- **Obiectiv**: Redesign complet pagină profil public.
- **Pași**:
  - Nou layout de profil (hero section, cover, avatar mare, badge rank, join date).
  - Implementare **stats cards** (recorduri, greutate totală, număr de specii, activitate forum).
  - **Trophy showcase grid** – grilă cu top recorduri și poze, hover premium, click pentru detalii.
  - Optimizare **mobile responsive** (stack vertical, grid adaptiv, galerii swipe‑able).
  - Stop pentru review.

### Session 4 – Species Images (≈1.5 h)

- **Obiectiv**: Imagini reale pentru speciile de pești.
- **Pași**:
  - Căutare imagini calitative (Fishbase API, Wikipedia Commons, iNaturalist etc.).
  - Script automat (ex. `scripts/download_species_images.py`) pentru download + preprocesare.
  - Upload imagini în **R2** (folosind upload fix din Session 1).
  - Actualizare tabel `fish_species` cu `image_url`.
  - Afișare imagini în pagina Species.
  - Stop pentru review.

### Session 5 – Mobile Responsive (≈1.5 h)

- **Obiectiv**: Optimizare mobil pentru pagini cheie.
- **Pași**:
  - Records page – **card view pe mobil** (tabel doar pe desktop).
  - Species page – layout responsive (grid, typography, imagini).
  - Admin panel – UI adaptată pentru mobil (scroll, carduri, grafice).
  - Stop pentru review.

### Session 6 – Admin Map Editing (≈1.5 h)

- **Obiectiv**: Editare coordonate pe hartă de către admin.
- **Pași**:
  - Toggle **„Edit Mode”** în admin.
  - Când `editMode` este activ: markerii devin `draggable` (MapLibre / Leaflet, în funcție de ecran).
  - La `dragend`: se salvează noile coordonate în DB (tabel `fishing_locations`).  
  - Confirmare vizuală și/sau toast (succes/eroare).
  - Stop pentru review.

### Session 7 – Map Performance (≈2 h)

- **Obiectiv**: Clustering și încărcare performantă a markerilor.
- **Pași**:
  - Instalare **Supercluster**.
  - Conversie locații → GeoJSON `Feature` cu coordonate [lng, lat].
  - `cluster.load(...)` cu toate punctele.
  - Generare clustere pentru viewport curent (`getClusters(bounds, zoom)`).
  - Afișare markeri de cluster și „expansiune” la zoom in.
  - Lazy loading markeri (în funcție de zoom / viewport).
  - Stop pentru review.

### Session 8 – Forum System (FINAL – după design de ranking) 🔵

- **Obiectiv**: Sistem de forum complet, cu reputație și notificări.
- **Pași**:
  - Design **reputation system** (ranguri, puncte, acțiuni).
  - Schema DB forum (tabele topics, posts, users, ranks, notifications etc.).
  - Servicii forum (queries Supabase, fără mock data).
  - Unificare auth (reutilizare `@/lib/auth-supabase`, fără AuthProvider separat în forum).
  - Funcționalități forum: widgets, notificări, listări recente, membri activi.
  - Stop pentru review final.

---

## 2. Implementation Action Plan – Detaliat

### Step 0 – Safety First: Database Backup ✅

- **Prioritate**: Critică – înainte de orice modificare de schemă.
- **Acțiuni**:
  - Export **schema completă** și datele esențiale din Supabase.
  - Salvare în fișier de forma `backup-{timestamp}.sql` (sau structură deja existentă în `docs/backup`).
  - Test restaurare pe mediu local (Docker/PostgreSQL local, dacă este disponibil).

---

### Step 1 – Forum Database Setup 🗄️

- **Fișiere SQL existente** (deja pregătite):
  - `schema.sql` – schema completă cu toate tabelele pentru forum.
  - `rls_policies.sql` – RLS policies pentru securitate.
  - `seed_data.sql` – date inițiale (categorii, subcategorii, ranguri).
- **Tabele create (exemple)**:
  - `forum_categories`, `forum_subcategories`, `forum_topics`, `forum_posts`.
  - `forum_users`, `forum_user_ranks`, `forum_moderators`.
  - `forum_private_messages`, `forum_subscriptions`, `forum_reports`, `forum_attachments`.
  - `forum_ads`, `forum_stats` etc.
- **Pași**:
  - Executare `schema.sql` în Supabase.
  - Executare `rls_policies.sql` (RLS corect pe toate tabelele forum).
  - Executare `seed_data.sql` (categorii, subcategorii, ranguri).
  - Verificare tabele și relații (FK, indexuri).
  - Test query de bază pentru fiecare tabel (SELECT simplu).

---

### Step 2 – Forum Service: Replace Mock Data 🔄

- **Locație cod**: `client/src/forum/services/forumService.ts`.
- **Problema actuală**:
  - Există un `ForumStorage` bazat pe `localStorage` + mock data.
  - Niciun apel real la DB, nimic nu este persistent.
- **Soluție**:
  - Rescriere `forumService.ts` pentru a folosi **Supabase**.
  - Păstrare aceleași interfețe (ca să nu rupem frontend‑ul):  
    - `getCategories()`  
    - `getTopicsByCategory()`  
    - `getPostsByTopic()`  
    - `createTopic()`  
    - `createPost()`  
    - `incrementViews()` etc.
  - Adăugare error handling și loading states.

---

### Step 3 – Auth Unification 🔐

- **Obiectiv**: Forumul folosește **același sistem de auth** ca restul site‑ului.
- **Pași**:
  - Eliminare `forum/components/AuthProvider.tsx` (fără provider paralel).
  - Utilizare `@/lib/auth-supabase` + `useAuth` global în toate componentele forum.
  - Actualizare `forum/routes.tsx` să folosească AuthProvider global.
  - Creare **trigger** în Supabase pentru auto‑creare profil forum:

```sql
CREATE OR REPLACE FUNCTION create_forum_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO forum_users (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_forum_user();
```

---

### Step 4 – Cloudflare R2 Upload Fix 📤

- **Locație cod**: `netlify/functions/upload.mjs`.
- **Problema actuală**:
  - Multipart parsat incorect, ex.: `Buffer.from(file.content, 'base64')` deși conținutul nu este base64.
  - Formatul real al `event.body`/`form-data` nu este tratat corect.
- **Soluție propusă** (exemplu cu Busboy):

```js
import Busboy from '@fastify/busboy';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2-client';

export const handler = async (event) => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });

    let file;
    let category;
    let fileName;

    busboy.on('file', (fieldname, fileStream, filename, encoding, mimetype) => {
      const chunks = [];
      fileName = filename;

      fileStream.on('data', (chunk) => chunks.push(chunk));
      fileStream.on('end', () => {
        file = { buffer: Buffer.concat(chunks), mimetype };
      });
    });

    busboy.on('field', (fieldname, val) => {
      if (fieldname === 'category') category = val;
      if (fieldname === 'fileName') fileName = val || fileName;
    });

    busboy.on('finish', async () => {
      try {
        const key = `${category}/${fileName}`;
        const uploadCommand = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        });

        await s3Client.send(uploadCommand);
        resolve({
          statusCode: 200,
          body: JSON.stringify({ url: `${R2_PUBLIC_URL}/${key}` })
        });
      } catch (err) {
        reject(err);
      }
    });

    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
};
```

---

### Step 5 – Map User Marker Fix 🗺️

- **Problema observată**: Markerul locației utilizatorului se poate „muta” incorect (de ex. spre colțul stânga‑sus) după animațiile de tip `flyTo`.
- **Soluție** în `Home.tsx` (`addUserLocationMarker` / flux geolocație):
  - Asigurare că:
    - `setLngLat([longitude, latitude])` este apelat cu [lng, lat] în ordinea corectă.
    - Markerul este re‑setat / repoziționat **după** terminarea animației, folosind `map.once('moveend', ...)`.

Conceptual:

```ts
userMarker.setLngLat([longitude, latitude]);

mapInstanceRef.current?.once('moveend', () => {
  userMarker.setLngLat([longitude, latitude]);
});

mapInstanceRef.current?.flyTo({
  center: [longitude, latitude],
  zoom: 15,
  duration: 1000
});
```

Se va combina cu logica existentă (popup, reverse geocoding, salvare în `localStorage`) fără a o rupe.

---

### Step 6 – Dropdown Z‑Index Fix 🎨

- **Problemă**: Dropdown‑urile (ex. „Specie”, „Locație” în pagina Records) se deschid **sub** tabelul „Clasament General” din cauza stacking context‑ului.
- **Locație**: `client/src/pages/Records.tsx` (Select / Radix UI).
- **Soluții posibile**:
  - Radix UI Portal:

```tsx
<Select.Portal>
  <Select.Content className="z-[100] radix-select-content">
    {/* dropdown content */}
  </Select.Content>
</Select.Portal>
```

  - CSS global suplimentar (dacă este nevoie):

```css
.radix-select-content {
  z-index: 100 !important;
}
```

Scop: dropdown‑ul să fie întotdeauna deasupra tabelului și a altor layere.

---

### Step 7 – Public Profile Redesign 🎨

- **Elemente cheie**:
  - **Hero Section**:
    - Cover photo (gradient animat dacă nu există imagine reală).
    - Avatar mare cu border și umbră.
    - Nume, badge de rank, data înscrierii.
  - **Stats Overview & Cards**:
    - Număr total de recorduri.
    - Greutate totală prinsă (counter animat).
    - Număr de specii distincte.
    - Activitate forum (posts, topics, rating).
  - **Trophy Showcase**:
    - Grid cu top 6 recorduri cu imagine.
    - Hover effects premium, highlight recorduri „de aur”.
  - **Activity Timeline**:
    - Catches recente.
    - Postări forum.
    - Achievements / milestones.
  - **Responsive**:
    - Stack vertical pe < 768px.
    - Grile adaptate pentru mobile, scroll ușor, tap‑friendly.

---

### Step 8 – Species Images Implementation 🖼️

- **Surse posibile**:
  - **Fishbase API**, **Wikipedia Commons**, **iNaturalist** (respectând licențele).
- **Script automat (concept)** – ex. `scripts/download_species_images.py`:

```python
import requests
import os

SPECIES = ['Crap', 'Știucă', 'Șalău', 'Somn', 'Plătică']

for species in SPECIES:
    # 1. Căutare imagine prin API (Fishbase / Wikipedia / iNaturalist)
    # 2. Download imagine high-res
    # 3. Salvare local / upload către R2
    pass
```

- **Pași**:
  - Adăugare coloană `image_url` în `fish_species` (dacă nu există deja).
  - Upload imaginilor în R2 (folosind endpointul reparat).
  - Populare `image_url` în DB.
  - Afișare imagini în pagina Species (cu lazy‑loading / placeholders).

---

### Step 9 – Mobile Responsiveness: Records Page 📱

- **Obiectiv**: Tabel pe desktop, carduri pe mobil.
- **Schemă generală** în `Records.tsx`:

```tsx
{/* Desktop: tabel */}
<div className="hidden md:block">
  <table>
    {/* existing table */}
  </table>
</div>

{/* Mobile: carduri */}
<div className="md:hidden space-y-4">
  {filteredRecords.map((record) => (
    <RecordCard key={record.id} record={record} />
  ))}
</div>
```

- Cardurile mobile vor conține: specie, greutate, lungime, locație, dată, imagine (dacă există), badge pentru poziție în clasament etc.

---

### Step 10 – Admin Panel: Map Editing 🛠️

- **Obiectiv**: Editarea locațiilor direct de pe hartă.
- **Pași tehnici (concept)**:

```ts
const marker = new maplibregl.Marker({ draggable: editMode })
  .setLngLat([lng, lat])
  .addTo(map);

marker.on('dragend', async () => {
  const lngLat = marker.getLngLat();
  await supabase
    .from('fishing_locations')
    .update({
      latitude: lngLat.lat,
      longitude: lngLat.lng
    })
    .eq('id', locationId);
});
```

- Se va asigura:
  - Doar adminii văd / pot activa Edit Mode.
  - Feedback clar la salvare (toast‑uri, mesaje).
  - Undo / confirmare acolo unde este cazul.

---

### Step 11 – Map Performance Optimization ⚡

- **Tehnologie**: **Supercluster** pentru clustering puncte.
- **Pași**:
  - `npm install supercluster` în `client`.
  - Construire index:

```ts
import Supercluster from 'supercluster';

const cluster = new Supercluster({
  radius: 60,
  maxZoom: 16
});

cluster.load(
  locations.map((loc) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [loc.lng, loc.lat]
    },
    properties: loc
  }))
);
```

  - Obținere clustere pentru viewport curent:

```ts
const clusters = cluster.getClusters([west, south, east, north], zoom);
```

  - Randare separată pentru:
    - Clustere (cercuri mari cu număr).
    - Puncte individuale (când sunt destule detalii la zoom mare).

---

### Step 12 – Forum Features (Widgets + Notifications) 🔔

- **Obiectiv**: Funcționalități avansate pentru forum – recent posts, active members, notificări.
- **Exemple de queries Supabase**:

```ts
// Recent posts widget
const { data: recentPosts } = await supabase
  .from('forum_posts')
  .select('*, forum_topics(*), forum_users(*)')
  .order('created_at', { ascending: false })
  .limit(5);

// Active members
const { data: activeMembers } = await supabase
  .from('forum_users')
  .select('*')
  .order('post_count', { ascending: false })
  .limit(10);
```

- **Schema notificări** (concept):

```sql
CREATE TABLE forum_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50),      -- ex: 'reply', 'mention', 'like'
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- Integrare UI:
  - Icon de notificări în header.
  - Dropdown cu notificări ne‑citite.
  - Badge cu număr de notificări.

---

## 3. Timeline Estimat (rezumat)

- **Phase 1** – Backup + Forum DB Setup: ~1 h.
- **Phase 2** – Forum Service + Auth unificat: ~2 h.
- **Phase 3** – R2 Upload + Map marker + z‑index: ~1.5 h.
- **Phase 4** – UI Fixes & responsive: ~2 h.
- **Phase 5** – Profile Redesign + Species Images: ~3.5 h.
- **Phase 6** – Admin Map Editing + Performance: ~3.5 h.
- **Phase 7** – Forum Features finale: ~2 h.

Total estimat: **≈15–16 ore** lucru efectiv, împărțite în sesiuni cu pauze de review după fiecare pas major.


