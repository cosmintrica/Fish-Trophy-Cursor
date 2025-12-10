# Ghid Fix Variabile de Mediu Netlify

## Problema
Netlify a modificat denumirile a două chei Supabase, cauzând erori `401 (Unauthorized)` și `Invalid API key`.

## De ce există variabile duplicate? (Cu și fără `VITE_`)

**NU sunt duplicate inutile!** Au scopuri diferite:

### Variabile CU `VITE_` prefix → Frontend (Client-side)
- `VITE_SUPABASE_URL` - Pentru codul React/Vite (client-side)
- `VITE_SUPABASE_ANON_KEY` - Pentru codul React/Vite (client-side)
- **Folosite în:** `client/src/lib/supabase.ts` și toate componentele React

### Variabile FĂRĂ `VITE_` prefix → Funcții Netlify (Server-side)
- `SUPABASE_URL` - Pentru funcții Netlify (server-side)
- `SUPABASE_ANON_KEY` - Pentru funcții Netlify (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Pentru funcții Netlify (server-side, secretă!)
- `SUPABASE_DATABASE_URL` - Pentru funcții Netlify (server-side)
- `SUPABASE_JWT_SECRET` - Pentru funcții Netlify (server-side)
- **Folosite în:** `netlify/functions/*.mjs` (analytics.mjs, records.mjs, etc.)

**Netlify Supabase Extension** creează automat variabilele fără `VITE_` pentru funcții server-side.

## Soluție

### 1. Verifică Variabilele de Mediu în Netlify Dashboard

Accesează: **Netlify Dashboard → Site Settings → Environment Variables**

### 2. Variabilele Necesare pentru Frontend (Build & Runtime)

Următoarele variabile trebuie să existe și să fie corecte:

#### Variabile OBLIGATORII pentru Frontend:
- ✅ `VITE_SUPABASE_URL` - URL-ul proiectului Supabase (ex: `https://cckytfxrigzkpfkrrqbv.supabase.co`)
- ✅ `VITE_SUPABASE_ANON_KEY` - Cheia anonă publică de Supabase

#### Variabile OBLIGATORII pentru Funcții Netlify (Server-side):
- ✅ `SUPABASE_URL` - URL-ul proiectului Supabase (aceeași valoare ca `VITE_SUPABASE_URL`)
- ✅ `SUPABASE_ANON_KEY` - Cheia anonă publică (aceeași valoare ca `VITE_SUPABASE_ANON_KEY`)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Cheia service_role (SECRETĂ! NU pentru frontend!)
- ✅ `SUPABASE_DATABASE_URL` - URL-ul direct către baza de date (pentru funcții)
- ✅ `SUPABASE_JWT_SECRET` - Secretul JWT (pentru funcții)

**⚠️ IMPORTANT:** 
- Variabilele cu `VITE_` sunt pentru frontend (React/Vite)
- Variabilele fără `VITE_` sunt pentru funcții Netlify (server-side)
- **NU** șterge niciuna dintre ele - ambele sunt necesare!

### 3. Verifică Valorile

1. **Deschide Supabase Dashboard:**
   - Mergi la: https://supabase.com/dashboard
   - Selectează proiectul: `cckytfxrigzkpfkrrqbv`
   - Mergi la: **Settings → API**

2. **Copiază valorile corecte:**
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

3. **Actualizează în Netlify:**
   - Mergi la: **Netlify Dashboard → Site Settings → Environment Variables**
   - Verifică că `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` au valorile corecte
   - Dacă lipsesc sau sunt greșite, actualizează-le

### 4. Variabile pentru Development Local

**⚠️ CRITIC:** În development local, Vite NU poate accesa variabilele din Netlify Dashboard! Trebuie să existe un fișier `client/.env.local`.

#### Pas 1: Verifică dacă există `.env.local`
```powershell
cd client
Test-Path .env.local
```

#### Pas 2: Creează fișierul `.env.local` (dacă nu există)

**Opțiunea 1: Copiază din Netlify Dashboard**
1. Mergi la: **Netlify Dashboard → Site Settings → Environment Variables**
2. Copiază valorile pentru:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Creează fișierul `client/.env.local` cu:
```env
VITE_SUPABASE_URL=https://cckytfxrigzkpfkrrqbv.supabase.co
VITE_SUPABASE_ANON_KEY=<copiază valoarea din Netlify>
```

**Opțiunea 2: Copiază din Supabase Dashboard**
1. Mergi la: **Supabase Dashboard → Settings → API**
2. Copiază:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Creează fișierul `client/.env.local` cu valorile copiate

**⚠️ IMPORTANT:** 
- Nu comitați `.env.local` în Git! Este deja în `.gitignore`.
- După ce creezi fișierul, **repornește serverul** (`netlify dev`)
- Șterge cache-ul Vite dacă e necesar: `rm -rf client/node_modules/.vite` (sau `Remove-Item -Recurse -Force client/node_modules/.vite` în PowerShell)

### 5. Rebuild După Actualizare

După ce actualizezi variabilele în Netlify:

1. **Trigger un rebuild:**
   - Mergi la: **Netlify Dashboard → Deploys**
   - Click pe **"Trigger deploy"** → **"Clear cache and deploy site"**

2. **Sau pentru development local:**
   - Oprește serverul (`Ctrl+C`)
   - Șterge cache-ul: `rm -rf client/node_modules/.vite`
   - Repornește: `netlify dev`

### 6. Verificare

După rebuild, verifică în consolă că nu mai apar erori `401 (Unauthorized)` sau `Invalid API key`.

## Note Importante

### Diferența între variabile:

| Variabilă | Unde se folosește | Scop |
|-----------|-------------------|------|
| `VITE_SUPABASE_URL` | Frontend (React) | Client-side, expusă în browser |
| `VITE_SUPABASE_ANON_KEY` | Frontend (React) | Client-side, expusă în browser |
| `SUPABASE_URL` | Funcții Netlify | Server-side, NU expusă în browser |
| `SUPABASE_ANON_KEY` | Funcții Netlify | Server-side, NU expusă în browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Funcții Netlify | Server-side, SECRETĂ, bypass RLS |
| `SUPABASE_DATABASE_URL` | Funcții Netlify | Server-side, conexiune directă la DB |
| `SUPABASE_JWT_SECRET` | Funcții Netlify | Server-side, pentru validare JWT |

### Reguli de Aur:
- ✅ **PĂSTREAZĂ** toate variabilele (cu și fără `VITE_`)
- ✅ `VITE_*` → pentru frontend (React/Vite)
- ✅ `SUPABASE_*` (fără `VITE_`) → pentru funcții Netlify (server-side)
- ❌ **NU** șterge variabilele fără `VITE_` - sunt necesare pentru funcții!
- ❌ **NU** folosiți `SUPABASE_SERVICE_ROLE_KEY` în frontend - este secretă!
- ✅ Valorile din Netlify Dashboard au prioritate peste `netlify.toml`

## Troubleshooting

### Eroare: "Invalid API key"
- Verifică că `VITE_SUPABASE_ANON_KEY` este cheia **anon public**, nu service_role
- Verifică că nu există spații sau caractere invalide în valoare
- Verifică că valoarea este completă (cheile Supabase sunt foarte lungi)

### Eroare: "401 Unauthorized"
- Verifică că `VITE_SUPABASE_URL` este corect (fără trailing slash)
- Verifică că RLS (Row Level Security) este configurat corect în Supabase
- Verifică că cheia anonă nu a fost regenerată în Supabase

### Variabilele nu se încarcă
- Verifică că variabilele au prefixul `VITE_` pentru frontend
- Verifică că ai făcut rebuild după actualizare
- Verifică că nu există conflicte în `netlify.toml`

