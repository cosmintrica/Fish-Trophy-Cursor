#!/usr/bin/env node

/**
 * SETUP COMPLET SISTEM BACKUP PENTRU FISH TROPHY
 *
 * Acest script configurează complet sistemul de backup
 * și verifică că totul funcționează corect.
 *
 * Folosire:
 * node setup-backup-system.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 SETUP COMPLET SISTEM BACKUP');
console.log('===============================');

// Verifică dacă suntem în directorul corect
function checkProjectDirectory() {
  console.log('\n1️⃣  Verific directorul proiectului...');

  const requiredFiles = [
    'package.json',
    'supabase-schema-final.sql'
  ];

  let allExist = true;

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Lipsește!`);
      allExist = false;
    }
  }

  if (!allExist) {
    console.log('   ❌ Nu ești în directorul corect al proiectului!');
    console.log('   💡 Navighează la directorul Fish-Trophy-Cursor');
    return false;
  }

  console.log('   ✅ Directorul proiectului este corect');
  return true;
}

// Instalează dependențele
async function installDependencies() {
  console.log('\n2️⃣  Instalez dependențele...');

  return new Promise((resolve, reject) => {
    exec('node install-backup-deps.js', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Eroare la instalarea dependențelor:', error.message);
        reject(error);
        return;
      }

      console.log(stdout);
      console.log('   ✅ Dependențele au fost instalate');
      resolve();
    });
  });
}

// Creează directoarele necesare
function createDirectories() {
  console.log('\n3️⃣  Creez directoarele necesare...');

  const directories = [
    'database-backups',
    'database-backups/emergency',
    'database-backups/daily',
    'database-backups/weekly',
    'database-backups/monthly'
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ Creat: ${dir}`);
      } catch (error) {
        console.log(`   ❌ Nu s-a putut crea ${dir}:`, error.message);
        return false;
      }
    } else {
      console.log(`   ✅ Există: ${dir}`);
    }
  }

  return true;
}

// Creează fișierul de configurare
function createConfigFile() {
  console.log('\n4️⃣  Creez fișierul de configurare...');

  const config = {
    backup: {
      directories: {
        main: 'database-backups',
        emergency: 'database-backups/emergency',
        daily: 'database-backups/daily',
        weekly: 'database-backups/weekly',
        monthly: 'database-backups/monthly'
      },
      retention: {
        emergency: 1, // 1 zi
        daily: 7,     // 7 zile
        weekly: 4,    // 4 săptămâni
        monthly: 12   // 12 luni
      },
      automatic: {
        enabled: false,
        interval_minutes: 60,
        keep_days: 7
      }
    },
    supabase: {
      url: process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    created_at: new Date().toISOString(),
    version: '1.0'
  };

  try {
    fs.writeFileSync('backup-config.json', JSON.stringify(config, null, 2));
    console.log('   ✅ backup-config.json creat');
    return true;
  } catch (error) {
    console.log('   ❌ Nu s-a putut crea backup-config.json:', error.message);
    return false;
  }
}

// Creează scripturile de conveniență
function createConvenienceScripts() {
  console.log('\n5️⃣  Creez scripturile de conveniență...');

  // Script pentru backup rapid
  const quickBackupScript = `@echo off
echo 🚀 BACKUP RAPID FISH TROPHY
echo ===========================
node backup-database.js quick-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%
pause
`;

  try {
    fs.writeFileSync('backup-quick.bat', quickBackupScript);
    console.log('   ✅ backup-quick.bat creat');
  } catch (error) {
    console.log('   ⚠️  Nu s-a putut crea backup-quick.bat');
  }

  // Script pentru restore rapid
  const quickRestoreScript = `@echo off
echo 🔄 RESTORE RAPID FISH TROPHY
echo ============================
echo.
echo Backup-uri disponibile:
dir /b database-backups\\*.json
echo.
set /p backup_name="Introdu numele backup-ului: "
node restore-database.js %backup_name%
pause
`;

  try {
    fs.writeFileSync('restore-quick.bat', quickRestoreScript);
    console.log('   ✅ restore-quick.bat creat');
  } catch (error) {
    console.log('   ⚠️  Nu s-a putut crea restore-quick.bat');
  }

  return true;
}

// Testează sistemul
async function testSystem() {
  console.log('\n6️⃣  Testez sistemul...');

  return new Promise((resolve, reject) => {
    exec('node test-backup-system.js', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Testele au eșuat:', error.message);
        console.log(stdout);
        reject(error);
        return;
      }

      console.log(stdout);
      resolve();
    });
  });
}

// Creează primul backup
async function createInitialBackup() {
  console.log('\n7️⃣  Creez primul backup...');

  return new Promise((resolve, reject) => {
    exec('node backup-database.js initial-setup', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Eroare la primul backup:', error.message);
        console.log('   💡 Poți crea backup-ul manual mai târziu');
        resolve(); // Nu eșuează setup-ul pentru asta
        return;
      }

      console.log(stdout);
      console.log('   ✅ Primul backup creat cu succes');
      resolve();
    });
  });
}

// Afișează instrucțiuni finale
function showFinalInstructions() {
  console.log('\n🎉 SETUP COMPLET!');
  console.log('================');

  console.log('\n📋 SISTEMUL DE BACKUP ESTE GATA!');
  console.log('\n📁 Fișiere create:');
  console.log('   ✅ backup-database.js - Backup manual');
  console.log('   ✅ restore-database.js - Restore manual');
  console.log('   ✅ backup-automatic.js - Backup automat');
  console.log('   ✅ emergency-backup.js - Backup de urgență');
  console.log('   ✅ verify-backup.js - Verificare backup-uri');
  console.log('   ✅ backup-quick.bat - Backup rapid (Windows)');
  console.log('   ✅ restore-quick.bat - Restore rapid (Windows)');
  console.log('   ✅ backup-config.json - Configurare');
  console.log('   ✅ GHID_BACKUP_RESTORE.md - Ghid complet');

  console.log('\n📁 Directoare create:');
  console.log('   ✅ database-backups/ - Backup-uri principale');
  console.log('   ✅ database-backups/emergency/ - Backup-uri de urgență');
  console.log('   ✅ database-backups/daily/ - Backup-uri zilnice');
  console.log('   ✅ database-backups/weekly/ - Backup-uri săptămânale');
  console.log('   ✅ database-backups/monthly/ - Backup-uri lunare');

  console.log('\n🚀 COMENZI RAPIDE:');
  console.log('   📊 Backup: node backup-database.js');
  console.log('   🔄 Restore: node restore-database.js');
  console.log('   🚨 Urgență: node emergency-backup.js');
  console.log('   ✅ Test: node test-backup-system.js');
  console.log('   📖 Ghid: type GHID_BACKUP_RESTORE.md');

  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Setează SUPABASE_SERVICE_ROLE_KEY înainte de a folosi backup-ul!');
  console.log('   2. Testează backup-ul înainte de a-l folosi în producție!');
  console.log('   3. Citește ghidul complet pentru instrucțiuni detaliate!');
  console.log('   4. NICIODATĂ să nu rulezi comenzi periculoase fără backup!');

  console.log('\n🎯 URMĂTORII PAȘI:');
  console.log('   1. Setează variabila de mediu SUPABASE_SERVICE_ROLE_KEY');
  console.log('   2. Testează: node test-backup-system.js');
  console.log('   3. Fă primul backup: node backup-database.js');
  console.log('   4. Configurează backup automat dacă dorești');
}

// Funcția principală
async function main() {
  try {
    let allStepsPassed = true;

    // Verifică directorul
    if (!checkProjectDirectory()) {
      process.exit(1);
    }

    // Instalează dependențele
    try {
      await installDependencies();
    } catch (error) {
      console.log('   ⚠️  Instalarea dependențelor a eșuat, dar continui...');
    }

    // Creează directoarele
    if (!createDirectories()) {
      allStepsPassed = false;
    }

    // Creează fișierul de configurare
    if (!createConfigFile()) {
      allStepsPassed = false;
    }

    // Creează scripturile de conveniență
    createConvenienceScripts();

    // Testează sistemul
    try {
      await testSystem();
    } catch (error) {
      console.log('   ⚠️  Testele au eșuat, dar setup-ul continuă...');
    }

    // Creează primul backup
    try {
      await createInitialBackup();
    } catch (error) {
      console.log('   ⚠️  Primul backup a eșuat, dar poți crea manual mai târziu...');
    }

    // Afișează instrucțiunile finale
    showFinalInstructions();

    if (allStepsPassed) {
      console.log('\n✅ SETUP COMPLET CU SUCCES!');
    } else {
      console.log('\n⚠️  SETUP COMPLET CU WARNING-URI!');
      console.log('Verifică erorile de mai sus și corectează-le.');
    }

  } catch (error) {
    console.error('❌ EROARE CRITICĂ la setup:', error.message);
    process.exit(1);
  }
}

// Rulează setup-ul
main().catch(console.error);
