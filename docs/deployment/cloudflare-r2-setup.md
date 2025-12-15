# Cloudflare R2 Setup pentru Conținut Masiv

## 🎯 **Scopul**
Folosim Cloudflare R2 pentru toate fișierele mari (submisii, poze cu specii, locații, magazine) pentru a economisi costurile de transfer.

## 💰 **Economii estimate**
- **Supabase Storage:** $0.021/GB/lună + $0.09/GB transfer
- **Cloudflare R2:** $0.015/GB/lună + $0 transfer (GRATUIT!)
- **Economie:** ~70% pentru conținut cu multă vizualizare

## 🚀 **Setup Cloudflare R2**

### **1. Creează cont Cloudflare**
- Mergi la [cloudflare.com](https://cloudflare.com)
- Creează cont gratuit
- Activează R2 Object Storage

### **2. Creează bucket-ul**
```bash
# Nume bucket: fishtrophy-content
# Regiune: auto (cel mai aproape de utilizatori)
# Public access: DA
```

### **3. Configurează API Keys**
- Mergi la R2 > Manage R2 API tokens
- Creează token cu permisiuni:
  - `Object:Read`
  - `Object:Write`
  - `Object:Delete`

### **4. Adaugă environment variables**
```bash
# În Netlify
VITE_R2_ACCOUNT_ID=your_account_id
VITE_R2_ACCESS_KEY_ID=your_access_key
VITE_R2_SECRET_ACCESS_KEY=your_secret_key
VITE_R2_PUBLIC_URL=https://pub-1234567890abcdef.r2.dev
```

### **5. Configurează CORS (Critic pentru Upload)**
Pentru ca browserul să poată face upload direct (fără a trece prin server), trebuie să permiți originile site-ului tău.

1. Mergi la **Settings** în bucket-ul tău R2.
2. Scroll la secțiunea **CORS Policy**.
3. Adaugă următorul JSON:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:8888",
      "https://fishtrophy.ro",
      "https://www.fishtrophy.ro",
      "https://fishtrophy-cursor.netlify.app"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
> **Notă:** Asigură-te că `AllowedOrigins` conține TOATE domeniile de pe care accesezi aplicația (local și producție).

## 📁 **Structura bucket-ului**

```
fishtrophy-content/
├── {username}/                 # Folder per utilizator pentru conținut generat
│   ├── records/                # Record-uri (Trofee)
│   │   ├── images/
│   │   │   ├── record-123_timestamp.jpg
│   │   │   └── ...
│   │   └── videos/
│   │       ├── record-123_timestamp.mp4
│   │       └── ...
│   ├── journal/                # Capturi (Jurnal)
│   │   ├── images/
│   │   │   ├── catch-456_timestamp.jpg
│   │   │   └── ...
│   │   └── videos/
│   │       ├── catch-456_timestamp.mp4
│   │       └── ...
│   └── forum/                  # Postări Forum
│       ├── posts/
│       │   └── ...
│       └── ...
├── fish-species/               # Static: Imagini specii
│   ├── crap-main.jpg
│   ├── crap-detail.jpg
│   ├── crap-habitat.jpg
│   ├── salau-main.jpg
│   └── ...
├── locations/                  # Static: Imagini locații
│   ├── lacul-snagov-main.jpg
│   ├── lacul-snagov-aerial.jpg
│   ├── lacul-snagov-fishing-spot.jpg
│   └── ...
├── shops/                      # Static: Magazine
│   ├── magazin-pescuit-1-logo.jpg
│   ├── magazin-pescuit-1-exterior.jpg
│   └── ...
├── parking/                    # Static: Parcare
│   ├── lacul-snagov-parking.jpg
│   └── ...
└── educational/                # Static: Educațional
    ├── tehnici-pescuit-1.jpg
    └── ...
```

## 🔧 **Implementare în cod**

### **Exemplu de utilizare:**
```typescript
import { getFishSpeciesImage, getLocationImage } from '@/lib/supabase'

// Poza principală a unui crap
const crapImage = getFishSpeciesImage('Crap', 'main')

// Poza aeriană a Lacului Snagov
const snagovAerial = getLocationImage('lacul-snagov', 'aerial')

// Logo-ul unui magazin
const shopLogo = getShopImage('magazin-pescuit-1', 'logo')
```

## 📊 **Monitorizare costuri**

### **Supabase Storage (minimal):**
- Avatare: ~100MB/lună
- Thumbnail-uri: ~50MB/lună
- **Total:** ~$0.003/lună

### **Cloudflare R2 (conținut masiv):**
- Submisii (poze): ~2GB/lună
- Submisii (videouri): ~10GB/lună
- Poze specii: ~500MB
- Imagini locații: ~1GB
- Logo-uri magazine: ~100MB
- **Total:** ~$0.20/lună + transfer GRATUIT

## 🎯 **Avantaje**

1. **Costuri reduse** - transfer gratuit
2. **Performanță** - CDN global Cloudflare
3. **Scalabilitate** - fără limite de transfer
4. **Securitate** - integrare perfectă cu Cloudflare
5. **Flexibilitate** - ușor de gestionat

## ⚠️ **Considerații**

1. **Setup inițial** - trebuie configurat separat
2. **Backup** - asigură-te că ai backup-uri
3. **Monitorizare** - urmărește costurile
4. **Migrare** - poți migra ușor la alte servicii

## 🔄 **Plan de migrare**

1. **Faza 1:** Configurează R2
2. **Faza 2:** Migrează conținutul static
3. **Faza 3:** Actualizează codul
4. **Faza 4:** Testează performanța
5. **Faza 5:** Monitorizează costurile

---

## ⚠️ **Probleme întâlnite și soluții**

### **1. R2 Proxy - Eroare 400 Bad Request (Authorization)**

**Problema:** Imagini R2 nu se încărcau, eroare `400 Bad Request` cu mesaj `Authorization`.

**Cauza:** URL-urile R2 nu sunt publice și necesită autentificare AWS S3-compatible.

**Soluție:**
- Folosit AWS SDK (`@aws-sdk/client-s3`) cu `GetObjectCommand` în loc de `fetch()` direct
- Inițializat `S3Client` cu credențialele R2
- Corectat extragerea key-ului din URL (eliminat bucket name-ul dacă este prezent)

**Fișier:** `netlify/functions/r2-proxy.mjs`

**Detalii complete:** Vezi `docs/issues/R2_AND_FORUM_ISSUES_RESOLVED.md`

### **2. Extragere key din URL**

**Problema:** Key-ul extras din URL includea bucket name-ul (`fishtrophy-content`), dar key-ul salvat în R2 nu include bucket name-ul.

**Soluție:**
```javascript
// URL: https://...r2.cloudflarestorage.com/fishtrophy-content/username/journal/images/file.jpg
// Key în R2: username/journal/images/file.jpg (fără fishtrophy-content/)

if (pathname.startsWith(R2_BUCKET_NAME + '/')) {
  key = pathname.substring(R2_BUCKET_NAME.length + 1);
}
```

### **3. Environment variables**

**Important:** Variabilele de mediu în Netlify Functions NU au prefixul `VITE_`:
```bash
# ✅ Corect (Netlify Functions)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=fishtrophy-content
R2_PUBLIC_URL=https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content

# ❌ Greșit (nu funcționează în Netlify Functions)
VITE_R2_ACCOUNT_ID=...
```

**Client-side** (React) folosește `VITE_` prefix:
```bash
# Client-side
VITE_R2_PUBLIC_URL=...
```

### **4. Structura URL-uri**

**Format complet:**
```
https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content/username/journal/images/file.jpg
```

**Key salvat în R2:**
```
username/journal/images/file.jpg
```

**R2_PUBLIC_URL:**
```
https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content
```

**Notă:** `R2_PUBLIC_URL` include bucket name-ul, dar key-ul salvat în R2 nu include bucket name-ul.

---

## 📚 **Documentație suplimentară**

Pentru detalii complete despre problemele întâlnite și soluțiile implementate, vezi:
- `docs/issues/R2_AND_FORUM_ISSUES_RESOLVED.md` - Probleme R2 și Forum rezolvate