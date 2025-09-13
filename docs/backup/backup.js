#!/usr/bin/env node

/**
 * SCRIPT PRINCIPAL BACKUP - Fish Trophy
 *
 * Acest script redirecționează către sistemul de backup organizat
 * din folderul backup-system/
 *
 * Folosire:
 * node backup.js [comandă] [argumente...]
 *
 * Exemple:
 * node backup.js backup
 * node backup.js restore backup-2025-01-15
 * node backup.js emergency "mesaj-urgență"
 * node backup.js verify
 * node backup.js test
 */

const { exec } = require('child_process');
const path = require('path');

// Verifică dacă folderul backup-system există
const backupSystemPath = path.join(__dirname, 'backup-system');
const scriptsPath = path.join(backupSystemPath, 'scripts');

console.log('🛡️  FISH TROPHY BACKUP SYSTEM');
console.log('==============================');

// Verifică dacă sistemul de backup este instalat
function checkBackupSystem() {
  const fs = require('fs');

  if (!fs.existsSync(backupSystemPath)) {
    console.error('❌ EROARE: Sistemul de backup nu este instalat!');
    console.log('📁 Folderul backup-system nu există.');
    console.log('💡 Rulează: node backup-system/scripts/setup-backup-system.js');
    process.exit(1);
  }

  if (!fs.existsSync(scriptsPath)) {
    console.error('❌ EROARE: Scripturile de backup nu sunt găsite!');
    console.log('📁 Folderul backup-system/scripts nu există.');
    process.exit(1);
  }
}

// Afișează ajutorul
function showHelp() {
  console.log('\n📋 COMENZI DISPONIBILE:');
  console.log('======================');
  console.log('');
  console.log('🔄 BACKUP:');
  console.log('  node backup.js backup [nume-backup]');
  console.log('  node backup.js emergency [mesaj]');
  console.log('  node backup.js automatic [minute] [zile]');
  console.log('');
  console.log('🔄 RESTORE:');
  console.log('  node backup.js restore [nume-backup]');
  console.log('  node backup.js restore-list');
  console.log('');
  console.log('🔍 VERIFICARE:');
  console.log('  node backup.js verify [nume-backup]');
  console.log('  node backup.js test');
  console.log('');
  console.log('⚙️  SETUP:');
  console.log('  node backup.js setup');
  console.log('  node backup.js install');
  console.log('');
  console.log('📖 DOCUMENTAȚIE:');
  console.log('  node backup.js docs');
  console.log('  node backup.js help');
  console.log('');
  console.log('📁 BACKUP-URI:');
  console.log('  node backup.js list');
  console.log('  node backup.js clean [zile]');
}

// Rulează un script din backup-system
function runScript(scriptName, args = []) {
  const scriptPath = path.join(scriptsPath, scriptName);
  const command = `node "${scriptPath}" ${args.join(' ')}`;

  console.log(`🚀 Rulez: ${command}`);
  console.log('');

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Eroare:', error.message);
      process.exit(1);
    }

    if (stderr) {
      console.error('⚠️  Warning:', stderr);
    }

    console.log(stdout);
  });
}

// Funcția principală
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Verifică sistemul de backup
  checkBackupSystem();

  // Procesează comenzile
  switch (command) {
    case 'backup':
      runScript('backup-database.js', args.slice(1));
      break;

    case 'restore':
      if (args[1] === 'list' || !args[1]) {
        runScript('restore-database.js', []);
      } else {
        runScript('restore-database.js', args.slice(1));
      }
      break;

    case 'emergency':
      runScript('emergency-backup.js', args.slice(1));
      break;

    case 'automatic':
      runScript('backup-automatic.js', args.slice(1));
      break;

    case 'verify':
      runScript('verify-backup.js', args.slice(1));
      break;

    case 'test':
      runScript('test-backup-system.js', args.slice(1));
      break;

    case 'setup':
      runScript('setup-backup-system.js', args.slice(1));
      break;

    case 'install':
      runScript('install-backup-deps.js', args.slice(1));
      break;

    case 'list':
      runScript('verify-backup.js', []);
      break;

    case 'clean':
      console.log('🧹 Curățenie backup-uri...');
      runScript('verify-backup.js', ['--clean', ...args.slice(1)]);
      break;

    case 'docs':
      console.log('📖 Deschid documentația...');
      const docsPath = path.join(backupSystemPath, 'docs', 'GHID_BACKUP_RESTORE.md');
      const fs = require('fs');
      if (fs.existsSync(docsPath)) {
        console.log(fs.readFileSync(docsPath, 'utf8'));
      } else {
        console.log('❌ Documentația nu a fost găsită!');
      }
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.log('❌ Comandă necunoscută:', command);
      console.log('');
      showHelp();
      process.exit(1);
  }
}

// Rulează scriptul
main();

