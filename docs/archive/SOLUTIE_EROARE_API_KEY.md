# Soluție Eroare "Invalid API key" în Development Local

## Problema
Erori `401 (Unauthorized)` și `Invalid API key` în development local, deși variabilele sunt corecte în Netlify Dashboard.

## Cauza
În development local, **Vite NU poate accesa variabilele din Netlify Dashboard**. Trebuie să existe un fișier `client/.env.local` cu valorile corecte.

## Soluție Pas cu Pas

### Pas 1: Verifică că `.env.local` există
```powershell
cd "C:\Users\cosmi\Desktop\Proiecte\Fish Trophy Cursor\client"
Test-Path .env.local
```
Dacă returnează `False`, treci la Pas 2. Dacă returnează `True`, treci la Pas 3.

### Pas 2: Creează `.env.local` (dacă nu există)

**Opțiunea A: Copiază din Netlify Dashboard**
1. Mergi la: **Netlify Dashboard → Site Settings → Environment Variables**
2. Găsește `VITE_SUPABASE_ANON_KEY` și copiază valoarea completă
3. Creează fișierul `client/.env.local`:
```env
VITE_SUPABASE_URL=https://cckytfxrigzkpfkrrqbv.supabase.co
VITE_SUPABASE_ANON_KEY=<paste valoarea copiată aici>
```

**Opțiunea B: Copiază din Supabase Dashboard**
1. Mergi la: **Supabase Dashboard → Settings → API**
2. Copiază:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Creează fișierul `client/.env.local` cu valorile copiate

### Pas 3: Verifică conținutul `.env.local`
```powershell
Get-Content .env.local
```

**Asigură-te că:**
- ✅ `VITE_SUPABASE_URL=https://cckytfxrigzkpfkrrqbv.supabase.co` (fără spații, fără ghilimele)
- ✅ `VITE_SUPABASE_ANON_KEY=eyJ...` (cheia completă, fără spații, fără ghilimele)
- ✅ Nu există spații înainte/după `=`
- ✅ Nu există ghilimele `"` sau `'` în jurul valorilor
- ✅ Cheia anonă începe cu `eyJ` și este foarte lungă (peste 200 caractere)

**Exemplu CORECT:**
```env
VITE_SUPABASE_URL=https://cckytfxrigzkpfkrrqbv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRA5ct25U65M
```

**Exemplu GREȘIT:**
```env
VITE_SUPABASE_URL = "https://cckytfxrigzkpfkrrqbv.supabase.co"  # ❌ Spații și ghilimele
VITE_SUPABASE_ANON_KEY='eyJ...'  # ❌ Ghilimele
VITE_SUPABASE_ANON_KEY=eyJ...RRAa5ct25U65M  # ❌ Caracter invalid (ar trebui "5" nu "a")
```

### Pas 4: Șterge cache-ul Vite
```powershell
cd "C:\Users\cosmi\Desktop\Proiecte\Fish Trophy Cursor\client"
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

### Pas 5: Repornește serverul
```powershell
# Oprește serverul actual (Ctrl+C)
# Apoi repornește:
netlify dev
```

### Pas 6: Verifică în browser
1. Deschide DevTools (F12)
2. Mergi la tab-ul **Console**
3. Verifică că nu mai apar erori `401 (Unauthorized)` sau `Invalid API key`

## Dacă tot nu merge

### Verifică că cheia anonă este corectă
1. Mergi la: **Supabase Dashboard → Settings → API**
2. Copiază **anon public** key (nu service_role!)
3. Compară cu valoarea din `client/.env.local`
4. Dacă diferă, actualizează `.env.local` cu valoarea corectă
5. Șterge cache-ul și repornește serverul

### Verifică că nu există caractere invalide
Cheia anonă Supabase este un JWT (JSON Web Token) care:
- Începe cu `eyJ`
- Are 3 părți separate prin `.` (punct)
- Este foarte lungă (peste 200 caractere)
- Conține doar caractere alfanumerice și `-`, `_`, `.`

Dacă vezi caractere ciudate sau cheia pare trunchiată, copiază-o din nou.

## Note Importante

- ⚠️ **NU comitați `.env.local` în Git!** Este deja în `.gitignore`
- ⚠️ **Cheia anonă este PUBLICĂ** - poate fi expusă în frontend (nu este secretă)
- ⚠️ **NU folosiți `SUPABASE_SERVICE_ROLE_KEY`** în frontend - este SECRETĂ!
- ✅ După orice modificare în `.env.local`, **repornește serverul** și **șterge cache-ul Vite**

