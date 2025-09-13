#!/usr/bin/env node

/**
 * RESTORE SCRIPT PENTRU FISH TROPHY DATABASE
 *
 * ⚠️  ATENȚIE: Acest script va șterge datele existente și va restaura din backup!
 * Folosește cu precauție!
 *
 * Folosire:
 * node restore-database.js [nume-backup]
 *
 * Exemplu:
 * node restore-database.js backup-2025-01-15
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurare Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ EROARE: SUPABASE_SERVICE_ROLE_KEY nu este setat!');
  console.log('Setez variabila de mediu:');
  console.log('set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Directorul pentru backup-uri
const backupDir = path.join(__dirname, 'database-backups');

// Verifică dacă directorul există
if (!fs.existsSync(backupDir)) {
  console.error('❌ EROARE: Directorul database-backups nu există!');
  console.log('Rulează mai întâi backup-database.js pentru a crea backup-uri.');
  process.exit(1);
}

// Lista backup-urilor disponibile
function listBackups() {
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file.replace('.json', ''),
        path: filePath,
        size: stats.size,
        created: stats.mtime
      };
    })
    .sort((a, b) => b.created - a.created);

  return files;
}

// Afișează backup-urile disponibile
function showAvailableBackups() {
  const backups = listBackups();

  if (backups.length === 0) {
    console.log('❌ Nu există backup-uri disponibile!');
    return null;
  }

  console.log('\n📁 Backup-uri disponibile:');
  backups.forEach((backup, index) => {
    const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
    console.log(`${index + 1}. ${backup.name} (${sizeMB} MB) - ${backup.created.toLocaleString()}`);
  });

  return backups;
}

// Confirmă operațiunea
function confirmRestore(backupName) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(`\n⚠️  ATENȚIE: Vei restaura backup-ul "${backupName}"`);
    console.log('Această operațiune va șterge toate datele existente din baza de date!');
    console.log('Ești sigur că vrei să continui? (da/nu)');

    rl.question('Răspuns: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'da' || answer.toLowerCase() === 'yes');
    });
  });
}

// Restaurează un tabel
async function restoreTable(tableName, data) {
  try {
    if (!data || data.length === 0) {
      console.log(`⏭️  Tabel ${tableName}: fără date de restaurat`);
      return { success: true, records: 0 };
    }

    console.log(`🔄 Restaurez tabel ${tableName}...`);

    // Șterge datele existente
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Șterge tot

    if (deleteError) {
      console.error(`❌ Eroare la ștergerea datelor din ${tableName}:`, deleteError.message);
      return { success: false, error: deleteError.message };
    }

    // Inserează datele noi
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(data);

    if (insertError) {
      console.error(`❌ Eroare la inserarea datelor în ${tableName}:`, insertError.message);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ ${tableName}: ${data.length} înregistrări restaurate`);
    return { success: true, records: data.length };

  } catch (error) {
    console.error(`❌ Eroare la restaurarea tabelului ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Restaurează storage
async function restoreStorage(storageData) {
  try {
    console.log('🔄 Restaurez storage...');

    // Pentru storage, doar afișăm informațiile
    // Restaurarea efectivă a fișierelor necesită upload manual
    for (const [bucket, data] of Object.entries(storageData)) {
      if (data.error) {
        console.log(`❌ ${bucket}: ${data.error}`);
      } else {
        console.log(`✅ ${bucket}: ${data.files.length} fișiere (necesită upload manual)`);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Eroare la restaurarea storage:', error.message);
    return { success: false, error: error.message };
  }
}

// Funcția principală de restore
async function restoreDatabase(backupName) {
  try {
    // Găsește fișierul de backup
    const backups = listBackups();
    const backup = backups.find(b => b.name === backupName);

    if (!backup) {
      console.error(`❌ Backup-ul "${backupName}" nu a fost găsit!`);
      showAvailableBackups();
      process.exit(1);
    }

    // Confirmă operațiunea
    const confirmed = await confirmRestore(backupName);
    if (!confirmed) {
      console.log('❌ Operațiunea a fost anulată.');
      process.exit(0);
    }

    // Încarcă datele din backup
    console.log(`📁 Încarc backup-ul: ${backup.path}`);
    const backupData = JSON.parse(fs.readFileSync(backup.path, 'utf8'));

    console.log(`📊 Backup creat: ${backupData.metadata.created_at}`);
    console.log(`📝 Înregistrări totale: ${backupData.summary.total_records}`);

    // Restaurează tabelele
    let totalRestored = 0;
    let successfulTables = 0;

    for (const [tableName, tableData] of Object.entries(backupData.tables)) {
      if (tableData.error) {
        console.log(`⏭️  Tabel ${tableName}: eroare în backup - ${tableData.error}`);
        continue;
      }

      const result = await restoreTable(tableName, tableData.data);
      if (result.success) {
        totalRestored += result.records;
        successfulTables++;
      }
    }

    // Restaurează storage
    await restoreStorage(backupData.storage);

    console.log('\n🎉 RESTORE COMPLET!');
    console.log(`📊 Tabele restaurate: ${successfulTables}`);
    console.log(`📝 Înregistrări restaurate: ${totalRestored}`);
    console.log('⚠️  Storage: Verifică manual fișierele din backup!');

  } catch (error) {
    console.error('❌ EROARE CRITICĂ la restore:', error.message);
    process.exit(1);
  }
}

// Funcția principală
async function main() {
  const backupName = process.argv[2];

  if (!backupName) {
    console.log('📁 Backup-uri disponibile:');
    const backups = showAvailableBackups();
    if (!backups) {
      process.exit(1);
    }

    console.log('\nFolosire: node restore-database.js [nume-backup]');
    console.log('Exemplu: node restore-database.js backup-2025-01-15');
    process.exit(0);
  }

  await restoreDatabase(backupName);
}

// Rulează scriptul
main().catch(console.error);
