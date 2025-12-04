# Probleme R2 și Forum - Rezolvate ✅

## Data: 2025-12-03

---

## 1. R2 Proxy - Eroare 400 Bad Request (Authorization)

### **Problema:**
- Imagini R2 nu se încărcau în development și production
- Eroare: `400 Bad Request` cu mesaj `Authorization` de la R2
- URL-urile R2 nu sunt publice și necesită autentificare

### **Cauza:**
- `r2-proxy.mjs` folosea `fetch()` direct către URL-urile R2
- R2 necesită autentificare AWS S3-compatible pentru a accesa fișierele
- URL-urile R2 nu sunt publice (nu au signed URLs sau public access)

### **Soluție implementată:**

#### **1. Migrare la AWS SDK cu autentificare R2**
- Înlocuit `fetch()` direct cu `GetObjectCommand` din `@aws-sdk/client-s3`
- Inițializat `S3Client` cu credențialele R2 (similar cu `upload.mjs`)
- Folosit autentificare AWS S3-compatible pentru R2

#### **2. Corectare extragere key din URL**
- **Problema:** URL-ul include bucket name-ul (`fishtrophy-content`), dar key-ul salvat în R2 nu include bucket name-ul
- **Soluție:** Eliminat bucket name-ul din key-ul extras din URL
- **Format URL:** `https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content/username/journal/images/file.jpg`
- **Key salvat în R2:** `username/journal/images/file.jpg` (fără `fishtrophy-content/`)

#### **3. Procesare corectă a stream-ului**
- `response.Body` din AWS SDK este un stream
- Procesat stream-ul corect cu `for await` și convertit la Buffer
- Returnat ca base64 pentru Netlify Functions

### **Fișiere modificate:**
- `netlify/functions/r2-proxy.mjs`
  - Adăugat import pentru `S3Client` și `GetObjectCommand`
  - Inițializat S3 client cu credențialele R2
  - Corectat extragerea key-ului din URL (elimină bucket name)
  - Procesat corect stream-ul `response.Body`

### **Cod cheie:**
```javascript
// Inițializare S3 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  },
  forcePathStyle: false
});

// Extragere key (elimină bucket name dacă este prezent)
if (pathname.startsWith(R2_BUCKET_NAME + '/')) {
  key = pathname.substring(R2_BUCKET_NAME.length + 1);
}

// Fetch cu autentificare
const getObjectCommand = new GetObjectCommand({
  Bucket: R2_BUCKET_NAME,
  Key: key
});
const response = await s3Client.send(getObjectCommand);

// Procesare stream
const chunks = [];
for await (const chunk of response.Body) {
  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
}
const imageBuffer = Buffer.concat(chunks);
```

### **Environment variables necesare:**
```bash
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=fishtrophy-content
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com  # Opțional
R2_PUBLIC_URL=https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content
```

### **Status:** ✅ REZOLVAT

---

## 2. Forum - Eroare 406 (Not Acceptable) pentru forum_subcategories

### **Problema:**
- Eroare 406 când se accesa o pagină de categorie: `/forum/tehnici-de-pescuit`
- Request-ul către Supabase: `forum_subcategories?select=id&slug=ilike.tehnici-de-pescuit`
- Supabase returnează 406 pentru query-uri invalide cu `ilike` pe slug-uri

### **Cauza:**
- `CreateTopicModal.tsx` făcea o căutare cu `.ilike('slug', categoryId)` pentru `forum_subcategories`
- `categoryId` era de fapt un slug de categorie (ex: `tehnici-de-pescuit`), nu de subcategorie
- Supabase nu acceptă `ilike` pe slug-uri în anumite contexte (cauzează 406)

### **Soluție implementată:**

#### **1. Înlocuit `.ilike()` cu `.eq()`**
- Folosit exact match (`.eq()`) în loc de case-insensitive match (`.ilike()`)
- Adăugat `.eq('is_active', true)` pentru a filtra doar subcategoriile active
- Folosit `.maybeSingle()` pentru a evita erori când nu se găsește subcategoria

#### **2. Corectat logica de căutare**
- Verificat dacă `categoryId` este UUID sau slug
- Dacă este slug, căutat subcategoria cu exact match (nu ilike)
- Dacă nu se găsește, setat `resolvedSubcategoryId` la `null`

### **Fișiere modificate:**
- `client/src/forum/components/CreateTopicModal.tsx`
  - Linia 50-56: Înlocuit `.ilike('slug', categoryId)` cu `.eq('slug', categoryId)`
  - Adăugat `.eq('is_active', true)` pentru filtrare
  - Folosit `.maybeSingle()` pentru a evita erori

### **Cod înainte:**
```typescript
const { data } = await supabase
  .from('forum_subcategories')
  .select('id')
  .ilike('slug', categoryId)  // ❌ Cauzează 406
  .single();
```

### **Cod după:**
```typescript
const { data } = await supabase
  .from('forum_subcategories')
  .select('id')
  .eq('slug', categoryId)  // ✅ Exact match
  .eq('is_active', true)   // ✅ Filtrare active
  .maybeSingle();          // ✅ Evită erori când nu se găsește
```

### **Status:** ✅ REZOLVAT

---

## 3. Profile.tsx - Log în Console

### **Problema:**
- Log în console: `Profile: Loading initial data for user <user-id>`
- Log-ul apare la fiecare încărcare a paginii de profil
- Nu este necesar pentru producție

### **Soluție:**
- Eliminat `console.log('Profile: Loading initial data for user', user.id);` din `Profile.tsx`

### **Fișier modificat:**
- `client/src/pages/Profile.tsx` (linia 157)

### **Status:** ✅ REZOLVAT

---

## 📝 **Lecții învățate**

### **R2:**
1. **URL-urile R2 nu sunt publice** - necesită autentificare AWS S3-compatible
2. **Bucket name-ul nu este parte din key** - trebuie eliminat din URL când se extrage key-ul
3. **AWS SDK este necesar** - `fetch()` direct nu funcționează fără signed URLs
4. **Stream processing** - `response.Body` din AWS SDK este un stream, trebuie procesat corect

### **Forum:**
1. **Supabase 406 errors** - cauzate de query-uri invalide (ex: `ilike` pe slug-uri în anumite contexte)
2. **Folosește `.eq()` pentru exact match** - mai rapid și mai sigur decât `.ilike()`
3. **Folosește `.maybeSingle()`** - evită erori când nu se găsește înregistrarea

### **Best practices:**
1. **Elimină log-urile de debug** - nu lăsa `console.log()` în codul de producție
2. **Folosește exact match când este posibil** - mai rapid și mai sigur
3. **Procesează stream-urile corect** - folosește `for await` și convertește la Buffer

---

## 🔧 **Configurare R2 pentru viitor**

### **Environment variables (Netlify):**
```bash
R2_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_BUCKET_NAME=fishtrophy-content
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com  # Opțional
R2_PUBLIC_URL=https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content
```

### **Structura URL-uri R2:**
- **Format complet:** `https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content/username/journal/images/file.jpg`
- **Key în R2:** `username/journal/images/file.jpg` (fără `fishtrophy-content/`)
- **R2_PUBLIC_URL:** `https://<account-id>.r2.cloudflarestorage.com/fishtrophy-content`

### **Funcții Netlify:**
- `r2-proxy.mjs` - Proxy pentru imagini R2 (folosește AWS SDK cu autentificare)
- `upload.mjs` - Upload fișiere în R2 (folosește AWS SDK)
- `delete-r2-file.mjs` - Ștergere fișiere din R2 (folosește AWS SDK)

### **Client-side:**
- `getR2ImageUrlProxy()` - Generează URL proxy pentru imagini R2
- Folosește proxy în development (`http://localhost:8889/.netlify/functions/r2-proxy`)
- Folosește proxy în production (`/.netlify/functions/r2-proxy`)

---

## ✅ **Status final**

- ✅ R2 Proxy - funcționează corect cu autentificare AWS SDK
- ✅ Forum 406 error - rezolvat (folosește `.eq()` în loc de `.ilike()`)
- ✅ Profile log - eliminat

**Toate problemele au fost rezolvate și testate!** 🎉

