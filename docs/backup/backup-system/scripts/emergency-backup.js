#!/usr/bin/env node

/**
 * BACKUP DE URGENȚĂ PENTRU FISH TROPHY DATABASE
 *
 * Acest script creează un backup rapid în situații de urgență
 * cu verificări minime și salvare imediată.
 *
 * Folosire:
 * node emergency-backup.js [mesaj-urgență]
 *
 * Exemplu:
 * node emergency-backup.js "baza-corupta"
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurare Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ EROARE CRITICĂ: SUPABASE_SERVICE_ROLE_KEY nu este setat!');
  console.log('Setează rapid: set SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Creează directorul pentru backup-uri de urgență
const emergencyDir = path.join(__dirname, 'database-backups', 'emergency');
if (!fs.existsSync(emergencyDir)) {
  fs.mkdirSync(emergencyDir, { recursive: true });
}

// Numele backup-ului de urgență
const emergencyMessage = process.argv[2] || 'urgent';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupName = `EMERGENCY-${emergencyMessage}-${timestamp}`;
const backupPath = path.join(emergencyDir, `${backupName}.json`);

console.log('🚨 BACKUP DE URGENȚĂ ACTIVAT');
console.log('============================');
console.log(`📁 Backup: ${backupName}`);
console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);

// Backup rapid - doar tabelele critice
async function emergencyBackup() {
  try {
    const backupData = {
      metadata: {
        type: 'EMERGENCY_BACKUP',
        created_at: new Date().toISOString(),
        backup_name: backupName,
        emergency_message: emergencyMessage,
        version: '1.0-emergency'
      },
      tables: {},
      summary: {
        total_records: 0,
        successful_tables: 0,
        emergency: true
      }
    };

    // Tabelele critice pentru backup de urgență
    const criticalTables = [
      'profiles',
      'records',
      'fishing_locations',
      'fish_species'
    ];

    console.log('🔄 Backup rapid - tabele critice...');

    let totalRecords = 0;
    let successfulTables = 0;

    for (const table of criticalTables) {
      try {
        console.log(`   📊 ${table}...`);

        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
          backupData.tables[table] = { data: [], error: error.message };
        } else {
          const recordCount = data ? data.length : 0;
          console.log(`   ✅ ${table}: ${recordCount} înregistrări`);
          backupData.tables[table] = { data: data || [], error: null };
          totalRecords += recordCount;
          successfulTables++;
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
        backupData.tables[table] = { data: [], error: err.message };
      }
    }

    // Backup rapid storage metadata
    try {
      console.log('   📁 Storage metadata...');
      const { data: avatars } = await supabase.storage.from('avatars').list('', { limit: 100 });
      const { data: thumbnails } = await supabase.storage.from('thumbnails').list('', { limit: 100 });

      backupData.storage = {
        avatars: { files: avatars || [], error: null },
        thumbnails: { files: thumbnails || [], error: null }
      };

      console.log(`   ✅ Storage: ${(avatars?.length || 0) + (thumbnails?.length || 0)} fișiere`);
    } catch (err) {
      console.log(`   ⚠️  Storage: ${err.message}`);
      backupData.storage = { error: err.message };
    }

    // Actualizează summary
    backupData.summary = {
      total_records: totalRecords,
      successful_tables: successfulTables,
      emergency: true,
      created_at: new Date().toISOString()
    };

    // Salvează backup-ul de urgență
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    console.log('\n🎉 BACKUP DE URGENȚĂ COMPLET!');
    console.log(`📁 Fișier: ${backupPath}`);
    console.log(`📊 Tabele: ${successfulTables}/${criticalTables.length}`);
    console.log(`📝 Înregistrări: ${totalRecords}`);
    console.log(`💾 Mărime: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB`);

    // Creează și un backup în directorul principal
    const mainBackupPath = path.join(__dirname, 'database-backups', `${backupName}.json`);
    fs.copyFileSync(backupPath, mainBackupPath);
    console.log(`📁 Backup principal: ${mainBackupPath}`);

    // Creează un backup text simplu pentru citire rapidă
    const textBackupPath = path.join(emergencyDir, `${backupName}.txt`);
    const textContent = `BACKUP DE URGENȚĂ - ${backupName}
===============================
Creat: ${new Date().toLocaleString()}
Mesaj: ${emergencyMessage}
Tabele: ${successfulTables}/${criticalTables.length}
Înregistrări: ${totalRecords}

Tabele backup-uite:
${Object.entries(backupData.tables).map(([table, data]) =>
  `- ${table}: ${data.error ? 'EROARE' : data.data.length + ' înregistrări'}`
).join('\n')}

Pentru restore:
node restore-database.js ${backupName}
`;

    fs.writeFileSync(textBackupPath, textContent);
    console.log(`📄 Backup text: ${textBackupPath}`);

    return backupData;

  } catch (error) {
    console.error('❌ EROARE CRITICĂ la backup de urgență:', error.message);

    // Încearcă să salveze măcar informațiile de eroare
    const errorBackup = {
      metadata: {
        type: 'EMERGENCY_BACKUP_FAILED',
        created_at: new Date().toISOString(),
        backup_name: backupName,
        emergency_message: emergencyMessage,
        error: error.message
      },
      summary: {
        emergency: true,
        failed: true,
        error: error.message
      }
    };

    try {
      fs.writeFileSync(backupPath, JSON.stringify(errorBackup, null, 2));
      console.log(`💾 Eroare salvată în: ${backupPath}`);
    } catch (writeError) {
      console.error('❌ Nu s-a putut salva nici măcar eroarea:', writeError.message);
    }

    process.exit(1);
  }
}

// Funcția principală
async function main() {
  console.log('⚠️  ATENȚIE: Acest script creează un backup rapid de urgență!');
  console.log('📋 Folosește doar în situații critice!');
  console.log('');

  await emergencyBackup();

  console.log('\n📋 URMĂTORII PAȘI:');
  console.log('1. Verifică backup-ul: node verify-backup.js ' + backupName);
  console.log('2. Dacă e OK, poți face restore: node restore-database.js ' + backupName);
  console.log('3. Contactează suportul dacă ai probleme!');
}

// Rulează backup-ul de urgență
main().catch(console.error);
