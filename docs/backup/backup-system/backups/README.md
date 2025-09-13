# 📁 Backup Files

Acest folder conține backup-urile locale ale bazei de date.

## ⚠️ **IMPORTANT - SECURITATE**

**Aceste fișiere NU sunt urcate pe GitHub** pentru a proteja datele sensibile!

## 📋 **Conținut:**

- `backup-database-*.sql` - Backup-uri complete ale bazei de date
- `backup-complete-*.sql` - Backup-uri cu toate datele
- `RAPORT_*.md` - Rapoarte de backup

## 🔒 **Cum funcționează:**

1. **Backup-urile se creează local** când rulezi scripturile
2. **Se păstrează în acest folder** pentru acces rapid
3. **NU se urcă pe GitHub** (sunt în `.gitignore`)
4. **Sunt necesare pentru restore** și testare

## 🚀 **Pentru a face backup nou:**

```bash
# Din folderul docs/backup/backup-system/
node backup-database.js
```

## 📤 **Pentru a face restore:**

```bash
# Din folderul docs/backup/backup-system/
node restore-database.js
```

## ⚠️ **ATENȚIE:**

- **Nu șterge** aceste fișiere dacă vrei să păstrezi backup-urile
- **Nu le urca** pe GitHub - conțin date sensibile
- **Fă backup regulat** pentru a nu pierde datele
