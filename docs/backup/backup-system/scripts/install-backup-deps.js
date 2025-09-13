#!/usr/bin/env node

/**
 * INSTALARE DEPENDENȚE PENTRU BACKUP
 *
 * Acest script instalează toate dependențele necesare
 * pentru scripturile de backup și restore.
 *
 * Folosire:
 * node install-backup-deps.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 INSTALARE DEPENDENȚE BACKUP');
console.log('==============================');

// Verifică dacă package.json există
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ EROARE: package.json nu există!');
  console.log('Rulează acest script din directorul rădăcină al proiectului.');
  process.exit(1);
}

// Dependențe necesare
const requiredDeps = [
  '@supabase/supabase-js'
];

// Dependențe de dezvoltare (opționale)
const devDeps = [
  'readline'
];

console.log('📦 Verific dependențe...');

// Verifică dacă dependențele sunt deja instalate
function checkDependency(dep) {
  try {
    require.resolve(dep);
    return true;
  } catch (e) {
    return false;
  }
}

// Instalează o dependență
function installDependency(dep, isDev = false) {
  return new Promise((resolve, reject) => {
    const command = `npm install ${isDev ? '--save-dev' : '--save'} ${dep}`;

    console.log(`📥 Instalez ${dep}...`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Eroare la instalarea ${dep}:`, error.message);
        reject(error);
        return;
      }

      if (stderr && !stderr.includes('npm WARN')) {
        console.error(`⚠️  Warning pentru ${dep}:`, stderr);
      }

      console.log(`✅ ${dep} instalat cu succes`);
      resolve();
    });
  });
}

// Funcția principală
async function main() {
  try {
    let needsInstall = false;

    // Verifică dependențele necesare
    for (const dep of requiredDeps) {
      if (!checkDependency(dep)) {
        console.log(`❌ Lipsește: ${dep}`);
        needsInstall = true;
      } else {
        console.log(`✅ Găsit: ${dep}`);
      }
    }

    // Verifică dependențele de dezvoltare
    for (const dep of devDeps) {
      if (!checkDependency(dep)) {
        console.log(`⚠️  Lipsește (opțional): ${dep}`);
      } else {
        console.log(`✅ Găsit: ${dep}`);
      }
    }

    if (!needsInstall) {
      console.log('\n🎉 Toate dependențele sunt deja instalate!');
      return;
    }

    console.log('\n📥 Instalez dependențele lipsă...');

    // Instalează dependențele necesare
    for (const dep of requiredDeps) {
      if (!checkDependency(dep)) {
        await installDependency(dep, false);
      }
    }

    // Instalează dependențele de dezvoltare
    for (const dep of devDeps) {
      if (!checkDependency(dep)) {
        try {
          await installDependency(dep, true);
        } catch (error) {
          console.log(`⚠️  Nu s-a putut instala ${dep} (opțional)`);
        }
      }
    }

    console.log('\n✅ INSTALARE COMPLETĂ!');
    console.log('\n📋 Următorii pași:');
    console.log('1. Setează variabilele de mediu:');
    console.log('   set VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.log('   set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
    console.log('\n2. Testează backup-ul:');
    console.log('   node backup-database.js test');
    console.log('\n3. Citește ghidul complet:');
    console.log('   type GHID_BACKUP_RESTORE.md');

  } catch (error) {
    console.error('❌ EROARE la instalare:', error.message);
    process.exit(1);
  }
}

// Rulează scriptul
main().catch(console.error);
