# 📋 INSTRUCȚIUNI BACKUP - ÎNAINTE DE FIX RLS

## ⚠️ IMPORTANT: Fă backup înainte de a rula orice migration!

### Opțiunea 1: Backup prin Supabase Dashboard (RECOMANDAT)

1. Mergi la: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/database
2. Click pe **"Backups"** în meniul din stânga
3. Click pe **"Create backup"** sau **"Download backup"**
4. Salvează backup-ul local

### Opțiunea 2: Backup prin Supabase CLI (Dacă ai CLI instalat)

```bash
# Asigură-te că ești în directorul proiectului
cd "C:\Users\cosmi\Desktop\Proiecte\Fish Trophy Cursor"

# Export complet (schema + date)
supabase db dump --linked > backup_complet_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# SAU doar schema
supabase db dump --schema-only --linked > backup_schema_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# SAU doar date
supabase db dump --data-only --linked > backup_data_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### Opțiunea 3: Backup prin SQL Editor (Pentru verificare)

1. Deschide Supabase SQL Editor
2. Rulează scriptul: `sql-scripts/backup_before_rls_fix.sql`
3. Rezultatele vor fi afișate în consolă (pentru verificare număr de înregistrări)

### Opțiunea 4: Backup automat prin Dashboard

1. Mergi la: **Settings** → **Database** → **Backups**
2. Activează **"Point-in-time recovery"** (dacă nu e deja activat)
3. Activează **"Daily backups"**
4. Setează **Retention period**: 30 zile

## ✅ Verificare Backup

După ce ai făcut backup-ul, verifică:

1. **Număr de înregistrări**: Rulează query-ul de verificare din `backup_before_rls_fix.sql`
2. **Dimensiune backup**: Asigură-te că backup-ul nu e gol
3. **Locație backup**: Salvează backup-ul într-un loc sigur (nu doar local)

## 🚨 Dacă ceva merge greșit

1. **NU panica!**
2. Mergi la **Dashboard** → **Database** → **Backups**
3. Selectează backup-ul dorit
4. Click pe **"Restore"**
5. Confirmă restaurarea

## 📝 Notă

Backup-urile automate din Supabase sunt deja configurate (dacă ai activat Point-in-Time Recovery).
Acest backup manual este doar o măsură de siguranță suplimentară înainte de modificări majore.

