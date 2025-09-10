# 🛡️ Fish Trophy Backup System

Sistem complet de backup și restore pentru baza de date Fish Trophy.

## 📁 Structura Folderului

```
backup-system/
├── scripts/              # Scripturi de backup
│   ├── backup-database.js        # Backup manual
│   ├── restore-database.js       # Restore manual
│   ├── backup-automatic.js       # Backup automat
│   ├── emergency-backup.js       # Backup de urgență
│   ├── verify-backup.js          # Verificare backup-uri
│   ├── test-backup-system.js     # Test sistem
│   ├── install-backup-deps.js    # Instalare dependențe
│   └── setup-backup-system.js    # Setup complet
├── backups/              # Backup-uri salvate
│   ├── emergency/        # Backup-uri de urgență
│   ├── daily/           # Backup-uri zilnice
│   ├── weekly/          # Backup-uri săptămânale
│   └── monthly/         # Backup-uri lunare
├── docs/                # Documentație
│   ├── GHID_BACKUP_RESTORE.md    # Ghid complet
│   └── REZUMAT_BACKUP_SISTEM.md  # Rezumat sistem
└── README.md            # Acest fișier
```

## 🚀 Comenzi Rapide

### Din folderul rădăcină:
```bash
# Backup manual
node backup.js backup

# Backup de urgență
node backup.js emergency "mesaj-urgență"

# Restore
node backup.js restore backup-2025-01-15

# Verificare
node backup.js verify

# Test sistem
node backup.js test
```

### Din folderul backup-system:
```bash
# Setup complet
node scripts/setup-backup-system.js

# Backup manual
node scripts/backup-database.js

# Restore
node scripts/restore-database.js

# Backup automat
node scripts/backup-automatic.js
```

## 📖 Documentație

- **`docs/GHID_BACKUP_RESTORE.md`** - Ghid complet de utilizare
- **`docs/REZUMAT_BACKUP_SISTEM.md`** - Rezumat sistem

## ⚠️ Importante

1. **Setează variabilele de mediu** înainte de a folosi sistemul
2. **Testează sistemul** înainte de a-l folosi în producție
3. **Citește documentația** pentru instrucțiuni detaliate
4. **NICIODATĂ** să nu rulezi comenzi periculoase fără backup!

## 🔧 Setup Inițial

1. Navighează la folderul rădăcină al proiectului
2. Rulează: `node backup.js setup`
3. Setează variabilele de mediu
4. Testează: `node backup.js test`
5. Fă primul backup: `node backup.js backup`

