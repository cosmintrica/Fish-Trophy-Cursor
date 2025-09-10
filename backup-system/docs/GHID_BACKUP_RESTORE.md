# 🛡️ Ghid Backup & Restore - Fish Trophy Database

## ⚠️ IMPORTANT - REGULI DE SIGURANȚĂ

1. **NICIODATĂ** să nu rulezi `supabase reset` sau comenzi similare!
2. **ÎNTOTDEAUNA** fă backup înainte de modificări majore!
3. **VERIFICĂ** că backup-ul este valid înainte de restore!
4. **PĂSTREAZĂ** mai multe backup-uri pentru siguranță!

## 📁 Structura Fișierelor

```
Fish-Trophy-Cursor/
├── backup-database.js          # Script backup manual
├── restore-database.js         # Script restore manual  
├── backup-automatic.js         # Script backup automat
├── database-backups/           # Director cu backup-urile
│   ├── backup-2025-01-15.json
│   ├── backup-2025-01-16.json
│   └── ...
└── GHID_BACKUP_RESTORE.md      # Acest ghid
```

## 🔧 Configurare Inițială

### 1. Instalează dependențele
```bash
npm install @supabase/supabase-js
```

### 2. Setează variabilele de mediu
```bash
# Windows
set VITE_SUPABASE_URL=https://cckytfxrigzkpfkrrqbv.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Linux/Mac
export VITE_SUPABASE_URL=https://cckytfxrigzkpfkrrqbv.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Verifică conexiunea
```bash
node backup-database.js test-connection
```

## 📊 Backup Manual

### Backup simplu
```bash
node backup-database.js
```

### Backup cu nume personalizat
```bash
node backup-database.js backup-2025-01-15
```

### Ce include backup-ul:
- ✅ **Toate tabelele**: profiles, records, fishing_locations, etc.
- ✅ **Toate datele**: utilizatori, recorduri, locații, etc.
- ✅ **Storage metadata**: informații despre fișiere
- ✅ **Metadate**: data creării, mărime, versiune
- ✅ **Verificare**: validare integritate date

## 🔄 Restore Manual

### Lista backup-urilor disponibile
```bash
node restore-database.js
```

### Restore din backup specific
```bash
node restore-database.js backup-2025-01-15
```

### ⚠️ ATENȚIE la restore:
- **Șterge toate datele existente!**
- **Cere confirmare înainte de execuție!**
- **Nu poate fi anulat după ce începe!**

## 🤖 Backup Automat

### Pornește backup automat (1 oră, păstrează 7 zile)
```bash
node backup-automatic.js
```

### Backup automat personalizat
```bash
# Backup la fiecare 30 minute, păstrează 3 zile
node backup-automatic.js 30 3

# Backup la fiecare 2 ore, păstrează 14 zile  
node backup-automatic.js 120 14
```

### Oprește backup automat
```
Apasă Ctrl+C
```

## 📋 Comenzi Rapide

### Backup urgent
```bash
node backup-database.js urgent-$(date +%Y%m%d-%H%M)
```

### Verifică backup-urile
```bash
ls -la database-backups/
```

### Restore rapid (ultimul backup)
```bash
node restore-database.js $(ls -t database-backups/*.json | head -1 | xargs basename -s .json)
```

## 🚨 Scenarii de Urgență

### 1. Baza de date coruptă
```bash
# 1. Fă backup rapid
node backup-database.js emergency-$(date +%Y%m%d-%H%M)

# 2. Restaurează din ultimul backup bun
node restore-database.js backup-2025-01-15
```

### 2. Date șterse accidental
```bash
# 1. NU face nimic în baza de date!
# 2. Găsește ultimul backup bun
ls -la database-backups/

# 3. Restaurează
node restore-database.js backup-2025-01-15
```

### 3. Testare înainte de deploy
```bash
# 1. Backup producție
node backup-database.js production-backup-$(date +%Y%m%d)

# 2. Testează pe staging
# 3. Dacă totul e OK, deploy
# 4. Dacă nu, restaurează
node restore-database.js production-backup-2025-01-15
```

## 📊 Monitorizare Backup-uri

### Verifică mărimea backup-urilor
```bash
du -h database-backups/
```

### Verifică ultimul backup
```bash
ls -la database-backups/ | head -5
```

### Verifică conținutul unui backup
```bash
# Vezi doar metadatele
head -20 database-backups/backup-2025-01-15.json

# Verifică structura
jq '.metadata' database-backups/backup-2025-01-15.json
```

## 🔒 Siguranță și Best Practices

### 1. Backup regulat
- **Zilnic**: Backup automat
- **Înainte de deploy**: Backup manual
- **Înainte de modificări mari**: Backup manual

### 2. Testează backup-urile
- **Lunar**: Testează restore pe staging
- **Verifică**: Că toate datele sunt complete
- **Documentează**: Orice probleme găsite

### 3. Păstrează backup-uri multiple
- **7 zile**: Backup-uri zilnice
- **4 săptămâni**: Backup-uri săptămânale  
- **12 luni**: Backup-uri lunare

### 4. Monitorizează spațiul
- **Curăță**: Backup-urile vechi automat
- **Verifică**: Mărimea backup-urilor
- **Optimizează**: Dacă devin prea mari

## 🆘 Suport și Debugging

### Probleme comune:

#### 1. "SUPABASE_SERVICE_ROLE_KEY nu este setat"
```bash
# Verifică variabila
echo $SUPABASE_SERVICE_ROLE_KEY

# Setează din nou
export SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

#### 2. "Backup-ul nu se creează"
```bash
# Verifică conexiunea
node -e "console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)"

# Testează manual
node backup-database.js test
```

#### 3. "Restore nu funcționează"
```bash
# Verifică fișierul backup
ls -la database-backups/backup-2025-01-15.json

# Verifică conținutul
head -10 database-backups/backup-2025-01-15.json
```

### Log-uri și debugging:
- Toate scripturile afișează log-uri detaliate
- Verifică console.log pentru erori
- Backup-urile conțin metadate pentru debugging

## 📞 Contact

Dacă întâmpini probleme:
1. Verifică acest ghid
2. Verifică log-urile din console
3. Testează pe staging înainte de producție
4. **NICIODATĂ** să nu rulezi comenzi periculoase fără backup!

---

**⚠️ AMINTIRE: Baza de date conține date importante! Folosește aceste scripturi cu responsabilitate!**
