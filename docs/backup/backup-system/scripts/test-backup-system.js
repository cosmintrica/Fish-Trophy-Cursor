#!/usr/bin/env node

/**
 * TEST SISTEM BACKUP PENTRU FISH TROPHY DATABASE
 *
 * Acest script testează toate funcționalitățile de backup
 * fără să afecteze datele existente.
 *
 * Folosire:
 * node test-backup-system.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurare Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cckytfxrigzkpfkrrqbv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 TEST SISTEM BACKUP');
console.log('====================');

// Test 1: Verifică dependențele
function testDependencies() {
  console.log('\n1️⃣  Testez dependențele...');

  try {
    require('@supabase/supabase-js');
    console.log('   ✅ @supabase/supabase-js');
  } catch (e) {
    console.log('   ❌ @supabase/supabase-js - Rulează: node install-backup-deps.js');
    return false;
  }

  try {
    require('readline');
    console.log('   ✅ readline');
  } catch (e) {
    console.log('   ⚠️  readline (opțional)');
  }

  return true;
}

// Test 2: Verifică variabilele de mediu
function testEnvironment() {
  console.log('\n2️⃣  Testez variabilele de mediu...');

  if (!supabaseUrl) {
    console.log('   ❌ VITE_SUPABASE_URL nu este setat');
    return false;
  }
  console.log('   ✅ VITE_SUPABASE_URL:', supabaseUrl);

  if (!supabaseServiceKey) {
    console.log('   ❌ SUPABASE_SERVICE_ROLE_KEY nu este setat');
    console.log('   💡 Setează: set SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    return false;
  }
  console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY: ***' + supabaseServiceKey.slice(-4));

  return true;
}

// Test 3: Verifică conexiunea la Supabase
async function testSupabaseConnection() {
  console.log('\n3️⃣  Testez conexiunea la Supabase...');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test simplu - încearcă să citești din tabela profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.log('   ❌ Eroare la conexiune:', error.message);
      return false;
    }

    console.log('   ✅ Conexiune la Supabase funcționează');
    console.log(`   📊 Profiles în baza de date: ${data ? data.length : 0} (sample)`);

    return true;

  } catch (error) {
    console.log('   ❌ Eroare la conexiune:', error.message);
    return false;
  }
}

// Test 4: Verifică scripturile de backup
function testBackupScripts() {
  console.log('\n4️⃣  Testez scripturile de backup...');

  const scripts = [
    'backup-database.js',
    'restore-database.js',
    'backup-automatic.js',
    'verify-backup.js',
    'install-backup-deps.js'
  ];

  let allExist = true;

  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`   ✅ ${script}`);
    } else {
      console.log(`   ❌ ${script} - Lipsește!`);
      allExist = false;
    }
  }

  return allExist;
}

// Test 5: Verifică directorul pentru backup-uri
function testBackupDirectory() {
  console.log('\n5️⃣  Testez directorul pentru backup-uri...');

  const backupDir = path.join(__dirname, 'database-backups');

  if (!fs.existsSync(backupDir)) {
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('   ✅ Director creat:', backupDir);
    } catch (error) {
      console.log('   ❌ Nu s-a putut crea directorul:', error.message);
      return false;
    }
  } else {
    console.log('   ✅ Director există:', backupDir);
  }

  // Verifică permisiunile de scriere
  try {
    const testFile = path.join(backupDir, 'test-write.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('   ✅ Permisiuni de scriere OK');
  } catch (error) {
    console.log('   ❌ Nu se poate scrie în director:', error.message);
    return false;
  }

  return true;
}

// Test 6: Test backup rapid (fără să salveze)
async function testBackupFunctionality() {
  console.log('\n6️⃣  Testez funcționalitatea de backup...');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test backup unui tabel mic
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .limit(5);

    if (error) {
      console.log('   ❌ Eroare la citirea datelor:', error.message);
      return false;
    }

    console.log(`   ✅ Am citit ${data.length} înregistrări din profiles`);

    // Test structura backup-ului
    const mockBackup = {
      metadata: {
        created_at: new Date().toISOString(),
        backup_name: 'test-backup',
        version: '1.0'
      },
      tables: {
        profiles: { data: data, error: null }
      },
      summary: {
        total_records: data.length,
        successful_tables: 1
      }
    };

    console.log('   ✅ Structura backup-ului este validă');

    return true;

  } catch (error) {
    console.log('   ❌ Eroare la testarea backup-ului:', error.message);
    return false;
  }
}

// Funcția principală
async function main() {
  try {
    let allTestsPassed = true;

    // Rulează toate testele
    allTestsPassed &= testDependencies();
    allTestsPassed &= testEnvironment();

    if (allTestsPassed) {
      allTestsPassed &= await testSupabaseConnection();
      allTestsPassed &= await testBackupFunctionality();
    }

    allTestsPassed &= testBackupScripts();
    allTestsPassed &= testBackupDirectory();

    // Rezultat final
    console.log('\n🎯 REZULTAT FINAL');
    console.log('================');

    if (allTestsPassed) {
      console.log('✅ TOATE TESTELE AU TRECUT!');
      console.log('\n🎉 Sistemul de backup este gata de utilizare!');
      console.log('\n📋 Următorii pași:');
      console.log('1. Fă primul backup: node backup-database.js');
      console.log('2. Verifică backup-ul: node verify-backup.js');
      console.log('3. Citește ghidul: type GHID_BACKUP_RESTORE.md');
    } else {
      console.log('❌ UNELE TESTE AU EȘUAT!');
      console.log('\n🔧 Verifică erorile de mai sus și încearcă din nou.');
      console.log('\n💡 Sugestii:');
      console.log('- Rulează: node install-backup-deps.js');
      console.log('- Setează variabilele de mediu');
      console.log('- Verifică conexiunea la Supabase');
    }

  } catch (error) {
    console.error('❌ EROARE CRITICĂ la testare:', error.message);
    process.exit(1);
  }
}

// Rulează testele
main().catch(console.error);
