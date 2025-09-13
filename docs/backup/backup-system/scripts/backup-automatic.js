#!/usr/bin/env node

/**
 * BACKUP AUTOMAT PENTRU FISH TROPHY DATABASE
 *
 * Acest script rulează backup-uri automate la intervale regulate
 * și șterge backup-urile vechi pentru a economisi spațiu.
 *
 * Folosire:
 * node backup-automatic.js [interval-minutes] [keep-days]
 *
 * Exemplu:
 * node backup-automatic.js 60 7  (backup la fiecare oră, păstrează 7 zile)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurare
const INTERVAL_MINUTES = parseInt(process.argv[2]) || 60; // Default: 1 oră
const KEEP_DAYS = parseInt(process.argv[3]) || 7; // Default: 7 zile
const BACKUP_DIR = path.join(__dirname, 'database-backups');

console.log('🔄 BACKUP AUTOMAT ACTIVAT');
console.log(`⏰ Interval: ${INTERVAL_MINUTES} minute`);
console.log(`📅 Păstrează backup-uri: ${KEEP_DAYS} zile`);
console.log(`📁 Director: ${BACKUP_DIR}`);

// Creează directorul pentru backup-uri
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Rulează backup-ul
async function runBackup() {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 [${new Date().toLocaleString()}] Încep backup automat...`);

    exec('node backup-database.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Eroare la backup: ${error.message}`);
        reject(error);
        return;
      }

      if (stderr) {
        console.error(`⚠️  Warning: ${stderr}`);
      }

      console.log(stdout);
      console.log(`✅ Backup completat la ${new Date().toLocaleString()}`);
      resolve();
    });
  });
}

// Șterge backup-urile vechi
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          created: stats.mtime
        };
      });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);

    const oldFiles = files.filter(file => file.created < cutoffDate);

    if (oldFiles.length > 0) {
      console.log(`🧹 Șterg ${oldFiles.length} backup-uri vechi...`);

      oldFiles.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Șters: ${file.name}`);
      });
    } else {
      console.log('✅ Nu există backup-uri vechi de șters');
    }

  } catch (error) {
    console.error('❌ Eroare la curățarea backup-urilor:', error.message);
  }
}

// Funcția principală
async function main() {
  try {
    // Backup inițial
    await runBackup();
    cleanupOldBackups();

    // Setează intervalul
    setInterval(async () => {
      try {
        await runBackup();
        cleanupOldBackups();
      } catch (error) {
        console.error('❌ Eroare în backup automat:', error.message);
      }
    }, INTERVAL_MINUTES * 60 * 1000);

    console.log(`\n✅ Backup automat activat!`);
    console.log(`⏰ Următorul backup în ${INTERVAL_MINUTES} minute`);
    console.log(`🛑 Apasă Ctrl+C pentru a opri`);

  } catch (error) {
    console.error('❌ Eroare la pornirea backup-ului automat:', error.message);
    process.exit(1);
  }
}

// Gestionare oprire
process.on('SIGINT', () => {
  console.log('\n🛑 Backup automat oprit');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Backup automat oprit');
  process.exit(0);
});

// Rulează scriptul
main().catch(console.error);
