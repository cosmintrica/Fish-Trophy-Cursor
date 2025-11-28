# 🔄 Explicație: Circular Foreign-Key Constraints

## ❓ Ce înseamnă?

**Circular foreign-key constraints** = o tabelă se referă la ea însăși prin foreign keys.

### 📋 Exemple din proiectul tău:

#### 1. **catch_comments** (Comentarii la capturi)
```sql
CREATE TABLE catch_comments (
  id UUID PRIMARY KEY,
  catch_id UUID REFERENCES catches(id),
  parent_comment_id UUID REFERENCES catch_comments(id),  -- ⚠️ Se referă la el însuși!
  content TEXT
);
```

**Ce face:**
- Un comentariu poate fi un **reply** la alt comentariu
- `parent_comment_id` pointează către un alt rând din **aceeași tabelă**

**Exemplu:**
```
Comentariu #1: "Frumos pește!" (parent_comment_id = NULL)
  └─ Comentariu #2: "Mulțumesc!" (parent_comment_id = #1)
      └─ Comentariu #3: "Cu plăcere!" (parent_comment_id = #2)
```

#### 2. **private_messages** (Mesaje private)
```sql
CREATE TABLE private_messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  parent_message_id UUID REFERENCES private_messages(id),  -- ⚠️ Se referă la el însuși!
  thread_root_id UUID REFERENCES private_messages(id),      -- ⚠️ Se referă la el însuși!
  content TEXT
);
```

**Ce face:**
- Un mesaj poate fi un **reply** la alt mesaj
- `parent_message_id` și `thread_root_id` pointează către alte rânduri din **aceeași tabelă**

**Exemplu:**
```
Mesaj #1: "Salut!" (parent_message_id = NULL, thread_root_id = #1)
  └─ Mesaj #2: "Salut și ție!" (parent_message_id = #1, thread_root_id = #1)
      └─ Mesaj #3: "Cum ești?" (parent_message_id = #2, thread_root_id = #1)
```

## ⚠️ De ce apare warning-ul?

Când faci backup **doar cu date** (`--data-only`), `pg_dump` nu știe în ce ordine să insereze datele:

1. **Problema:** Dacă încearcă să insereze Comentariu #2 (care are `parent_comment_id = #1`) **ÎNAINTE** de Comentariu #1, PostgreSQL va da eroare: *"Foreign key constraint violation"*

2. **Soluția automată:** `pg_dump` încearcă să găsească o ordine corectă, dar pentru tabele cu constrângeri circulare, uneori nu poate garanta ordinea perfectă.

## ✅ Soluții pentru Restore

### Opțiunea 1: Folosește Backup-ul Complet (RECOMANDAT) ⭐
```bash
# Backup complet = schema + date (ordinea este garantată)
npx supabase db dump --linked --file backup_complet.sql

# Restore
psql "postgresql://..." < backup_complet.sql
```
**De ce funcționează:** Backup-ul complet include schema (CREATE TABLE) + date (INSERT), deci PostgreSQL știe exact structura și poate gestiona constrângerile corect.

### Opțiunea 2: Restore cu --disable-triggers (AVANSAT)
```bash
# Restore doar date, dar dezactivează temporar trigger-ele
psql "postgresql://..." -c "SET session_replication_role = 'replica';" < backup_data.sql
psql "postgresql://..." -c "SET session_replication_role = 'origin';"
```
**Ce face:** Dezactivează temporar verificarea constrângerilor, inserează toate datele, apoi reactivează verificarea.

### Opțiunea 3: Restore Manual (PAS CU PAS)
```sql
-- 1. Dezactivează constrângerile
ALTER TABLE catch_comments DISABLE TRIGGER ALL;
ALTER TABLE private_messages DISABLE TRIGGER ALL;

-- 2. Inserează datele
\i backup_data.sql

-- 3. Reactivează constrângerile
ALTER TABLE catch_comments ENABLE TRIGGER ALL;
ALTER TABLE private_messages ENABLE TRIGGER ALL;
```

## 🎯 Concluzie

**⚠️ Warning-ul NU înseamnă că backup-ul este invalid!**

- ✅ Backup-ul complet funcționează perfect
- ✅ Backup-ul cu date funcționează, dar la restore poate necesita pași extra
- ✅ Pentru siguranță, folosește **backup-ul complet** pentru restore

**📝 Recomandare:**
- **Backup complet** = pentru restore complet (schema + date)
- **Backup date** = pentru migrare date între baze similare (cu schema deja creată)

## 🔍 Verificare Backup

Pentru a verifica că backup-ul este valid:
```bash
# Verifică că fișierul nu e gol
Get-Item backup_complet.sql | Select-Object Length

# Verifică că conține SQL valid
head -n 50 backup_complet.sql
```

