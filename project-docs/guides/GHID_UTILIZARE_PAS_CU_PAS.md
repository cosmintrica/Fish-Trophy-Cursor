# 🎯 Ghid Utilizare Pas cu Pas - Fish Trophy

## 📋 Ce Vei Învăța

În acest ghid vei învăța:
1. **Cum să faci backup** la baza de date
2. **Cum să corectezi orașele** lipsă
3. **Cum să rulezi aplicația** local
4. **Cum să verifici** că totul funcționează

## 🚀 PASUL 1: Backup Inițial (OBLIGATORIU!)

### De ce este important?
- **Protejează datele** existente
- **Permite restore** dacă ceva merge rău
- **Este obligatoriu** înainte de orice modificare

### Cum să faci backup:

#### 1.1. Verifică că ești în folderul corect:
```bash
# Ar trebui să vezi folderul backup-system
dir backup-system
```

#### 1.2. Fă primul backup:
```bash
# Backup manual
node backup.js backup "backup-initial-complet"

# Sau backup de urgență (mai rapid)
node backup.js emergency "backup-initial"
```

#### 1.3. Verifică că backup-ul este valid:
```bash
# Verifică backup-ul
node backup.js verify
```

**✅ Dacă vezi "BACKUP VALID", poți continua!**

## 🏙️ PASUL 2: Corectare Orașe (OPȚIONAL)

### De ce să corectezi orașele?
- **282 orașe** în baza de date actuală
- **319 orașe** necesare (37 lipsă)
- **Aplicația va funcționa** mai bine cu toate orașele

### Cum să corectezi orașele:

#### 2.1. Backup înainte de modificări:
```bash
# Backup de siguranță
node backup.js emergency "inainte-correctare-orase"
```

#### 2.2. Execută scriptul SQL:
1. **Deschide Supabase** în browser
2. **Mergi la SQL Editor**
3. **Copiază conținutul** din `project-docs/database/CORECTARE_ORASE_LIPSITE.sql`
4. **Lipește în SQL Editor**
5. **Rulează scriptul**

#### 2.3. Verifică rezultatul:
```sql
-- Verifică numărul total de orașe
SELECT COUNT(*) as total_orase FROM cities;

-- Ar trebui să vezi: 319 orașe

-- Verifică legăturile cu județele
SELECT 
    c.county_id,
    co.name as county_name,
    COUNT(c.id) as orase_total
FROM cities c
JOIN counties co ON c.county_id = co.id
GROUP BY c.county_id, co.name 
ORDER BY c.county_id;
```

**✅ Dacă vezi 319 orașe, corectarea a reușit!**

## 🖥️ PASUL 3: Rulează Aplicația Local

### De ce să rulezi local?
- **Testezi modificările** înainte de producție
- **Vezi cum arată** aplicația
- **Verifici că totul** funcționează

### Cum să rulezi aplicația:

#### 3.1. Navighează la folderul client:
```bash
cd client
```

#### 3.2. Instalează dependențele:
```bash
npm install
```

#### 3.3. Pornește serverul:
```bash
npm run dev
```

#### 3.4. Deschide aplicația:
- **Browser**: `http://localhost:5173`
- **Aplicația** ar trebui să se deschidă automat

**✅ Dacă vezi aplicația, totul funcționează!**

## 🔍 PASUL 4: Verifică Funcționalitatea

### Ce să verifici:

#### 4.1. Verifică că aplicația se încarcă:
- **Pagina principală** se deschide
- **Nu există erori** în consolă
- **Toate paginile** funcționează

#### 4.2. Verifică orașele:
- **Mergi la pagina** de înregistrare record
- **Verifică că toate orașele** sunt afișate
- **Încearcă să cauți** un oraș nou adăugat

#### 4.3. Verifică backup-ul:
```bash
# Verifică backup-urile
node backup.js list

# Ar trebui să vezi backup-urile create
```

## 🚨 Dacă Ceva Merge Rău

### Problema: Backup nu funcționează
```bash
# Verifică sistemul
node backup.js test

# Dacă eșuează, verifică variabilele de mediu
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Problema: Aplicația nu se pornește
```bash
# Verifică dependențele
cd client
npm install

# Verifică că portul 5173 este liber
netstat -an | findstr 5173
```

### Problema: Orașele nu s-au adăugat
```bash
# Verifică în Supabase
# Rulează: SELECT COUNT(*) FROM fishing_locations;
# Ar trebui să vezi 319
```

## 📊 Rezultat Final

### ✅ **După ce termini, ar trebui să ai:**
- **Backup-uri** create și validate
- **319 orașe** în baza de date
- **Aplicația** rulează local fără erori
- **Toate funcționalitățile** funcționează

### 🎯 **Comenzi Rapide pentru Viitor:**
```bash
# Backup rapid
node backup.js backup

# Backup de urgență
node backup.js emergency "mesaj"

# Verificare
node backup.js verify

# Test sistem
node backup.js test
```

## 📖 Documentație Suplimentară

### 🛡️ **Backup și Restore:**
- **`backup-system/README.md`** - Ghid sistem backup
- **`backup-system/docs/GHID_BACKUP_RESTORE.md`** - Ghid complet

### 🏙️ **Corectare Orașe:**
- **`project-docs/guides/GHID_FINAL_ORASE.md`** - Ghid detaliat
- **`project-docs/database/CORECTARE_ORASE_LIPSITE.sql`** - Script SQL

### 🚀 **Deployment:**
- **`project-docs/deployment/DEPLOY_NETLIFY.md`** - Ghid deployment
- **`project-docs/deployment/NETLIFY_ENV_VARS.md`** - Variabile mediu

---

**🎣 Acum ești gata să folosești Fish Trophy!**
