# 📋 Cum să faci backup la baza de date

## Opțiunea 1: Prin Supabase Dashboard (CEL MAI SIMPLU)

1. Mergi la: https://supabase.com/dashboard/project/cckytfxrigzkpfkrrqbv/settings/database
2. Scroll jos la secțiunea **"Connection string"**
3. Copiază **"Connection pooling"** string (format: `postgresql://postgres.cckytfxrigzkpfkrrqbv:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`)
4. Rulează în terminal:

```powershell
# Instalează pg_dump dacă nu ai (prin PostgreSQL sau psql)
# Apoi rulează:

pg_dump "postgresql://postgres.cckytfxrigzkpfkrrqbv:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" > backup_complet_20250128.sql

# SAU doar date:
pg_dump --data-only "postgresql://postgres.cckytfxrigzkpfkrrqbv:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" > backup_data_20250128.sql

# SAU doar schema:
pg_dump --schema-only "postgresql://postgres.cckytfxrigzkpfkrrqbv:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" > backup_schema_20250128.sql
```

## Opțiunea 2: Prin Supabase CLI (Dacă ai Docker Desktop)

```powershell
# Link proiect (deja făcut)
npx supabase link --project-ref cckytfxrigzkpfkrrqbv

# Backup complet
npx supabase db dump --linked --file backup_complet_20250128.sql

# Backup doar date
npx supabase db dump --linked --data-only --file backup_data_20250128.sql
```

## Opțiunea 3: Prin Admin Panel (Funcție Netlify)

1. Mergi la pagina Admin → Tab "Backup"
2. Apasă "Creează Backup"
3. Apasă "Descarcă Backup"

## ⚠️ IMPORTANT

- **NU** folosi `supabase db reset` - șterge toate datele!
- **Fă backup** înainte de orice modificare majoră
- **Verifică** că backup-ul nu e gol înainte de a continua

