# 🔧 Setup Backup - Fish Trophy

## Pasul 1: Obține cheile necesare

1. Mergi la: **Supabase Dashboard** → **Settings** → **API**
2. Copiază:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **service_role key** (secret, din secțiunea "Project API keys")

## Pasul 2: Setează variabilele de mediu

### În PowerShell (Windows):

```powershell
# Setează URL-ul (dacă nu e deja setat)
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"

# Setează service role key (OBLIGATORIU)
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

### Verifică că sunt setate:

```powershell
echo $env:VITE_SUPABASE_URL
echo $env:SUPABASE_SERVICE_ROLE_KEY
```

## Pasul 3: Rulează backup-ul

### Opțiunea 1: Folosind scriptul PowerShell

```powershell
cd "docs/backup/backup-system/scripts"
.\run-backup.ps1
```

### Opțiunea 2: Direct cu Node.js

```powershell
cd "docs/backup/backup-system/scripts"
node backup-database.js backup-before-rls-fix-20250128
```

## Pasul 4: Verifică backup-ul

Backup-ul va fi salvat în:
```
docs/backup/backup-system/scripts/database-backups/backup-*.json
```

Verifică că fișierul există și are dimensiune > 0.

## ⚠️ IMPORTANT

- **NU** comita cheia `SUPABASE_SERVICE_ROLE_KEY` în Git!
- **NU** partaja cheia public!
- **Șterge** variabilele de mediu după ce ai terminat (opțional, dar recomandat)

## 🆘 Dacă întâmpini probleme

1. Verifică că ai instalat Node.js: `node --version`
2. Verifică că ai instalat dependențele: `npm install @supabase/supabase-js`
3. Verifică că cheia este corectă (începe cu `eyJ...`)
4. Verifică că URL-ul este corect (format: `https://xxxxx.supabase.co`)

