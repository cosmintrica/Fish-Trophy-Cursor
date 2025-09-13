#!/usr/bin/env node

/**
 * SETUP COMPLET PROIECT FISH TROPHY
 *
 * Acest script configurează complet proiectul
 * și te ghidează pas cu pas prin procesul de setup.
 *
 * Folosire:
 * node setup-project.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎣 SETUP COMPLET FISH TROPHY');
console.log('============================');

// Verifică dacă suntem în directorul corect
function checkProjectDirectory() {
  console.log('\n1️⃣  Verific directorul proiectului...');

  const requiredFiles = [
    'package.json',
    'client/package.json',
    'backup-system/README.md',
    'project-docs/guides/GHID_UTILIZARE_PAS_CU_PAS.md'
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

// Verifică sistemul de backup
function checkBackupSystem() {
  console.log('\n2️⃣  Verific sistemul de backup...');

  const backupFiles = [
    'backup-system/scripts/backup-database.js',
    'backup-system/scripts/restore-database.js',
    'backup-system/scripts/emergency-backup.js',
    'backup-system/scripts/verify-backup.js',
    'backup-system/scripts/test-backup-system.js'
  ];

  let allExist = true;

  for (const file of backupFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Lipsește!`);
      allExist = false;
    }
  }

  if (!allExist) {
    console.log('   ❌ Sistemul de backup nu este complet!');
    return false;
  }

  console.log('   ✅ Sistemul de backup este complet');
  return true;
}

// Verifică documentația
function checkDocumentation() {
  console.log('\n3️⃣  Verific documentația...');

  const docFiles = [
    'project-docs/guides/GHID_UTILIZARE_PAS_CU_PAS.md',
    'project-docs/guides/GHID_FINAL_ORASE.md',
    'project-docs/database/CORECTARE_ORASE_LIPSITE.sql',
    'project-docs/deployment/DEPLOY_NETLIFY.md',
    'README.md'
  ];

  let allExist = true;

  for (const file of docFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Lipsește!`);
      allExist = false;
    }
  }

  if (!allExist) {
    console.log('   ❌ Documentația nu este completă!');
    return false;
  }

  console.log('   ✅ Documentația este completă');
  return true;
}

// Testează sistemul de backup
async function testBackupSystem() {
  console.log('\n4️⃣  Testez sistemul de backup...');

  return new Promise((resolve, reject) => {
    exec('node backup.js test', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Testele de backup au eșuat:', error.message);
        console.log('   💡 Verifică variabilele de mediu');
        resolve(false);
        return;
      }

      console.log(stdout);
      console.log('   ✅ Testele de backup au trecut');
      resolve(true);
    });
  });
}

// Instalează dependențele client
async function installClientDependencies() {
  console.log('\n5️⃣  Instalez dependențele client...');

  return new Promise((resolve, reject) => {
    exec('cd client && npm install', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Eroare la instalarea dependențelor:', error.message);
        resolve(false);
        return;
      }

      console.log('   ✅ Dependențele client au fost instalate');
      resolve(true);
    });
  });
}

// Afișează instrucțiunile finale
function showFinalInstructions() {
  console.log('\n🎉 SETUP COMPLET!');
  console.log('================');

  console.log('\n📋 PROIECTUL ESTE GATA PENTRU UTILIZARE!');

  console.log('\n🚀 COMENZI RAPIDE:');
  console.log('   📊 Backup: node backup.js backup');
  console.log('   🚨 Urgență: node backup.js emergency "mesaj"');
  console.log('   🔄 Restore: node backup.js restore backup-2025-01-15');
  console.log('   ✅ Verificare: node backup.js verify');
  console.log('   🖥️  Aplicație: cd client && npm run dev');

  console.log('\n📖 DOCUMENTAȚIE:');
  console.log('   📋 Ghid pas cu pas: project-docs/guides/GHID_UTILIZARE_PAS_CU_PAS.md');
  console.log('   🏙️  Corectare orașe: project-docs/guides/GHID_FINAL_ORASE.md');
  console.log('   🛡️  Backup: backup-system/README.md');
  console.log('   🚀 Deployment: project-docs/deployment/DEPLOY_NETLIFY.md');

  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Fă backup înainte de orice modificare!');
  console.log('   2. Citește ghidul pas cu pas pentru instrucțiuni detaliate!');
  console.log('   3. Testează aplicația local înainte de producție!');

  console.log('\n🎯 URMĂTORII PAȘI:');
  console.log('   1. Citește: project-docs/guides/GHID_UTILIZARE_PAS_CU_PAS.md');
  console.log('   2. Fă primul backup: node backup.js backup');
  console.log('   3. Rulează aplicația: cd client && npm run dev');
  console.log('   4. Testează funcționalitatea');
}

// Funcția principală
async function main() {
  try {
    let allStepsPassed = true;

    // Verifică directorul
    if (!checkProjectDirectory()) {
      process.exit(1);
    }

    // Verifică sistemul de backup
    if (!checkBackupSystem()) {
      allStepsPassed = false;
    }

    // Verifică documentația
    if (!checkDocumentation()) {
      allStepsPassed = false;
    }

    // Testează sistemul de backup
    try {
      await testBackupSystem();
    } catch (error) {
      console.log('   ⚠️  Testele de backup au eșuat, dar setup-ul continuă...');
    }

    // Instalează dependențele client
    try {
      await installClientDependencies();
    } catch (error) {
      console.log('   ⚠️  Instalarea dependențelor a eșuat, dar setup-ul continuă...');
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

