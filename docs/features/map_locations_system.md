# Sistem Unificat de Locații pe Hartă

## 📋 Prezentare Generală

Sistemul unificat pentru afișarea tuturor tipurilor de locații pe hartă: locații de pescuit, magazine, birouri AJVPS și cazări/pensiuni.

## 🗂️ Structura Bazei de Date

### 1. Tabele Existente (Păstrate)

#### `fishing_locations`
- ✅ Deja există cu coordonate
- Tipuri: `lac`, `rau`, `fluviu`, `balti_private`, `balti_salbatic`, `mare`, `delta`
- Coordonate: `latitude`, `longitude` (OBLIGATORII)

#### `fishing_shops`
- ✅ Deja există cu coordonate opționale
- Coordonate: `latitude`, `longitude` (OPȚIONAL - trebuie completate pentru afișare pe hartă)

---

### 2. Tabele Noi

#### A. `ajvps_offices` (Birouri AJVPS și Instituții pentru Permise)

```sql
CREATE TABLE public.ajvps_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  office_type text NOT NULL CHECK (office_type IN ('ajvps', 'primarie', 'agentie', 'institutie')),
  address text NOT NULL,
  city text NOT NULL,
  county text NOT NULL,
  region text NOT NULL CHECK (region IN ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  phone text,
  email text,
  website text,
  opening_hours text,
  services text[], -- ['permise_pescuit', 'informatii', 'consultanta', 'recomandari']
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Caracteristici:**
- Coordonate OBLIGATORII (pentru afișare pe hartă)
- Tipuri: AJVPS, Primării, Agenții, Alte instituții
- Servicii disponibile (array)

#### B. `accommodations` (Cazări/Pensiuni/Complexe)

```sql
CREATE TABLE public.accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  accommodation_type text NOT NULL CHECK (accommodation_type IN ('pensiune', 'complex', 'cazare', 'hotel', 'vila')),
  address text NOT NULL,
  city text NOT NULL,
  county text NOT NULL,
  region text NOT NULL CHECK (region IN ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  fishing_location_id uuid REFERENCES public.fishing_locations(id) ON DELETE SET NULL, -- RELAȚIE OPCȚIONALĂ
  has_fishing_pond boolean DEFAULT false,
  fishing_pond_details jsonb, -- Detalii despre balta (dacă există)
  phone text,
  email text,
  website text,
  facilities text[], -- ['cazare', 'restaurant', 'parcare', 'baltă_pescuit', 'chirie_barcă', 'wc', 'duș']
  rating decimal(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Caracteristici:**
- Coordonate OBLIGATORII
- Relație opțională cu `fishing_locations` (dacă are balta proprie sau e lângă o locație)
- `has_fishing_pond`: flag pentru cazări cu balta proprie
- `fishing_pond_details`: JSON cu detalii (specii, prețuri, reguli)

---

## 🎨 Personalizare Carduri (În Cod)

**IMPORTANT:** Personalizarea se face DOAR în cod, nu în baza de date.

### Tipuri de Carduri

#### 1. Fishing Location Card
```typescript
// Template pentru locații de pescuit
- Icon bazat pe tip (🌊 râu, 🏞️ lac, etc.)
- Nume, subtitlu, județ, regiune
- Descriere
- Administrare (dacă există)
- Website, telefon
- Recorduri (count + badge)
- Butoane: "Vezi recorduri", "Adaugă record"
- Linkuri: Google Maps, Apple Maps
```

#### 2. Shop Card
```typescript
// Template pentru magazine
- Icon: 🏪
- Nume, adresă completă
- Rating + număr recenzii
- Servicii (array)
- Program (opening_hours)
- Website, telefon, email
- Buton: "Vezi detalii" (link către pagina shop)
- Linkuri: Google Maps, Apple Maps
```

#### 3. AJVPS Office Card
```typescript
// Template pentru birouri AJVPS
- Icon: 🏛️ (AJVPS) / 🏢 (Primărie) / 📋 (Agenție)
- Nume, tip birou, adresă
- Servicii disponibile
- Program (opening_hours)
- Website, telefon, email
- Buton: "Vezi detalii" (dacă există pagina dedicată)
- Linkuri: Google Maps, Apple Maps
```

#### 4. Accommodation Card
```typescript
// Template pentru cazări
- Icon: 🏨 (pensiune) / 🏡 (vila) / 🏖️ (complex)
- Nume, tip, adresă
- Rating + număr recenzii
- Facilități (array)
- "Are balta de pescuit" badge (dacă has_fishing_pond = true)
- Link către locația de pescuit asociată (dacă există)
- Website, telefon, email
- Buton: "Rezervă" (link extern sau modal)
- Linkuri: Google Maps, Apple Maps
```

---

## 🗺️ Sistem Unificat pe Hartă

### Serviciu Unificat

```typescript
// services/mapLocations.ts

export type MapLocationType = 
  | 'fishing_location' 
  | 'shop' 
  | 'ajvps_office' 
  | 'accommodation';

export interface UnifiedMapLocation {
  id: string;
  type: MapLocationType;
  name: string;
  coords: [number, number];
  category: string; // 'lac', 'rau', 'pensiune', 'ajvps', etc.
  county: string;
  region: string;
  // Câmpuri comune pentru afișare minimă
}

// Funcții de încărcare
export const loadAllMapLocations = async (): Promise<UnifiedMapLocation[]>
export const loadMapLocationsByType = async (type: MapLocationType): Promise<UnifiedMapLocation[]>
export const getMapLocationDetails = async (id: string, type: MapLocationType): Promise<any>
```

### Filtre pe Hartă

Filtre disponibile:
- **Toate** - afișează toate tipurile
- **Locații de pescuit** - doar fishing_locations
- **Magazine** - doar fishing_shops
- **Birouri AJVPS** - doar ajvps_offices
- **Cazări** - doar accommodations

### Marker Colors pe Hartă

```typescript
const markerColors = {
  'fishing_location': {
    'river': '#10b981',      // verde
    'fluviu': '#10b981',
    'lake': '#3b82f6',       // albastru
    'pond': '#ef4444',      // roșu
    'private_pond': '#f59e0b', // portocaliu
    'balti_salbatic': '#84cc16', // verde deschis
    'maritime': '#06b6d4'    // cyan
  },
  'shop': '#8b5cf6',         // violet
  'ajvps_office': '#ec4899', // roz
  'accommodation': '#f97316' // portocaliu
};
```

---

## 🔗 Relații și Sugestii

### Relație Cazări ↔ Locații de Pescuit

**Caz 1: Cazare cu balta proprie**
- `has_fishing_pond = true`
- `fishing_location_id = NULL` (sau poate fi legată de o locație generică)
- `fishing_pond_details` conține detalii despre balta proprie

**Caz 2: Cazare lângă o locație existentă**
- `has_fishing_pond = false`
- `fishing_location_id = <id locație>`
- Când utilizatorul vede locația, se sugerează cazarea

**Caz 3: Cazare fără balta, dar aproape de locații**
- `has_fishing_pond = false`
- `fishing_location_id = NULL`
- Se sugerează automat pe baza distanței (viitor)

---

## 🚀 Funcționalități Viitoare (Nu Acum)

### Sistem Automat de Sugestii

**Când utilizatorul selectează o locație de pescuit:**
1. Caută cazări în raza de X km (ex: 10 km)
2. Caută magazine în raza de Y km (ex: 5 km)
3. Afișează sugestii în sidebar sau în cardul locației

**Când utilizatorul selectează o cazare:**
1. Caută locații de pescuit apropiate
2. Caută magazine apropiate
3. Sugerează trasee/activități

**Implementare viitoare:**
```typescript
// services/locationSuggestions.ts

export interface LocationSuggestion {
  type: 'accommodation' | 'shop' | 'fishing_location';
  id: string;
  name: string;
  distance: number; // în km
  coords: [number, number];
}

export const getNearbySuggestions = async (
  centerCoords: [number, number],
  radiusKm: number,
  types: MapLocationType[]
): Promise<LocationSuggestion[]>
```

**Algoritm:**
- Calculează distanța Haversine între coordonate
- Filtrează locațiile în raza specificată
- Sortează după distanță
- Returnează top N sugestii

---

## 📝 Migrații Necesare

### 1. Creare tabel `ajvps_offices`
- Tabel complet cu toate câmpurile
- RLS policies (public read, admin CRUD)
- Indexuri pe `region`, `county`, `office_type`
- Trigger pentru `updated_at`

### 2. Creare tabel `accommodations`
- Tabel complet cu toate câmpurile
- Foreign key către `fishing_locations` (ON DELETE SET NULL)
- RLS policies (public read, admin CRUD)
- Indexuri pe `region`, `county`, `accommodation_type`, `fishing_location_id`
- Trigger pentru `updated_at`

### 3. Actualizare `fishing_shops`
- Asigură-te că toate shop-urile au coordonate pentru afișare pe hartă
- Adaugă index pe `latitude`, `longitude` (dacă nu există)

---

## 🎯 Implementare Pas cu Pas

### Faza 1: Baza de Date
1. ✅ Creare migrații pentru `ajvps_offices`
2. ✅ Creare migrații pentru `accommodations`
3. ✅ Actualizare `fishing_shops` (verificare coordonate)

### Faza 2: Servicii Backend
1. ✅ Creare `services/ajvpsOffices.ts`
2. ✅ Creare `services/accommodations.ts`
3. ✅ Creare `services/mapLocations.ts` (unificat)
4. ✅ Actualizare `services/fishingShops.ts` (pentru hartă)

### Faza 3: Componente Frontend
1. ✅ Actualizare `Home.tsx` - adăugare toate tipurile pe hartă
2. ✅ Creare componente card pentru fiecare tip
3. ✅ Adăugare filtre pe hartă
4. ✅ Actualizare culori markeri

### Faza 4: Admin Panel
1. ✅ Adăugare secțiune "Birouri AJVPS" în admin
2. ✅ Adăugare secțiune "Cazări" în admin
3. ✅ MapEditor pentru toate tipurile
4. ✅ Formulare CRUD pentru fiecare tip

---

## 📊 Structura Fișierelor

```
client/src/
├── services/
│   ├── ajvpsOffices.ts          # NOU
│   ├── accommodations.ts         # NOU
│   ├── mapLocations.ts          # NOU (unificat)
│   ├── fishingLocations.ts      # EXISTENT (actualizat)
│   └── fishingShops.ts          # EXISTENT (actualizat)
├── components/
│   ├── map/
│   │   ├── FishingLocationCard.tsx    # EXISTENT (actualizat)
│   │   ├── ShopCard.tsx              # NOU
│   │   ├── AJVPSOfficeCard.tsx       # NOU
│   │   └── AccommodationCard.tsx    # NOU
│   └── admin/
│       ├── AJVPSOfficesManager.tsx    # NOU
│       └── AccommodationsManager.tsx  # NOU
└── pages/
    ├── Home.tsx                 # EXISTENT (actualizat)
    └── Admin.tsx                # EXISTENT (actualizat)
```

---

## 🎨 Design Carduri

### Principii de Design
- **Consistent**: Toate cardurile au același stil de bază
- **Informativ**: Afișează informațiile esențiale
- **Acțiuni clare**: Butoane și linkuri evidente
- **Responsive**: Funcționează pe mobile și desktop

### Elemente Comune
- Header cu nume și icon
- Informații de contact (website, telefon)
- Linkuri către Google Maps / Apple Maps
- Buton de închidere (X)
- Stil consistent cu cardurile existente

---

## ✅ Checklist Implementare

- [ ] Migrații baza de date
- [ ] Servicii backend (TypeScript)
- [ ] Componente card pentru fiecare tip
- [ ] Integrare în Home.tsx
- [ ] Filtre pe hartă
- [ ] Culori markeri
- [ ] Admin panel - Birouri AJVPS
- [ ] Admin panel - Cazări
- [ ] MapEditor pentru toate tipurile
- [ ] Testare pe mobile
- [ ] Testare performanță (multe markeri)

---

## 🔮 Viitor (Nu Acum)

### Sistem Automat de Sugestii
- [ ] Funcție `getNearbySuggestions()`
- [ ] Calcul distanță Haversine
- [ ] Componentă UI pentru sugestii
- [ ] Integrare în carduri
- [ ] Cache pentru performanță

### Funcționalități Avansate
- [ ] Trasee recomandate (cazare → locații → magazine)
- [ ] Filtrare după distanță
- [ ] Clustering markeri la zoom out
- [ ] Heatmap pentru zone populare

---

**Data creării:** 2025-01-11  
**Status:** Planificare completă, gata pentru implementare

