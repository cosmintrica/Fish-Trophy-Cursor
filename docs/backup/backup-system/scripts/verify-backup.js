#!/usr/bin/env node

/**
 * VERIFICARE BACKUP PENTRU FISH TROPHY DATABASE
 *
 * Acest script verifică integritatea backup-urilor existente
 * și afișează statistici detaliate.
 *
 * Folosire:
 * node verify-backup.js [nume-backup]
 *
 * Exemplu:
 * node verify-backup.js backup-2025-01-15
 */

const fs = require('fs');
const path = require('path');

// Directorul pentru backup-uri
const backupDir = path.join(__dirname, 'database-backups');

// Verifică dacă directorul există
if (!fs.existsSync(backupDir)) {
  console.error('❌ EROARE: Directorul database-backups nu există!');
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

// Verifică integritatea unui backup
function verifyBackup(backupPath) {
  try {
    console.log(`🔍 Verific backup: ${path.basename(backupPath)}`);

    // Încarcă și parsează JSON
    const content = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(content);

    // Verifică structura de bază
    if (!backupData.metadata) {
      throw new Error('Lipsește secțiunea metadata');
    }

    if (!backupData.tables) {
      throw new Error('Lipsește secțiunea tables');
    }

    if (!backupData.summary) {
      throw new Error('Lipsește secțiunea summary');
    }

    // Verifică metadatele
    const metadata = backupData.metadata;
    console.log(`  📅 Creat: ${metadata.created_at}`);
    console.log(`  📝 Nume: ${metadata.backup_name}`);
    console.log(`  🔢 Versiune: ${metadata.version}`);

    // Verifică tabelele
    const tables = backupData.tables;
    let totalRecords = 0;
    let validTables = 0;
    let errorTables = 0;

    console.log(`\n  📊 Tabele:`);
    for (const [tableName, tableData] of Object.entries(tables)) {
      if (tableData.error) {
        console.log(`    ❌ ${tableName}: ${tableData.error}`);
        errorTables++;
      } else {
        const recordCount = tableData.data ? tableData.data.length : 0;
        console.log(`    ✅ ${tableName}: ${recordCount} înregistrări`);
        totalRecords += recordCount;
        validTables++;
      }
    }

    // Verifică storage
    const storage = backupData.storage;
    if (storage) {
      console.log(`\n  📁 Storage:`);
      for (const [bucket, data] of Object.entries(storage)) {
        if (data.error) {
          console.log(`    ❌ ${bucket}: ${data.error}`);
        } else {
          const fileCount = data.files ? data.files.length : 0;
          console.log(`    ✅ ${bucket}: ${fileCount} fișiere`);
        }
      }
    }

    // Verifică summary
    const summary = backupData.summary;
    console.log(`\n  📈 Summary:`);
    console.log(`    📊 Tabele totale: ${summary.total_tables}`);
    console.log(`    ✅ Tabele valide: ${summary.successful_tables}`);
    console.log(`    📝 Înregistrări totale: ${summary.total_records}`);
    console.log(`    💾 Mărime backup: ${(summary.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`);

    // Verifică consistența
    if (totalRecords !== summary.total_records) {
      console.log(`    ⚠️  Inconsistență: totalRecords (${totalRecords}) != summary.total_records (${summary.total_records})`);
    }

    if (validTables !== summary.successful_tables) {
      console.log(`    ⚠️  Inconsistență: validTables (${validTables}) != summary.successful_tables (${summary.successful_tables})`);
    }

    // Rezultat final
    const isValid = errorTables === 0 && totalRecords === summary.total_records;

    console.log(`\n  🎯 Rezultat: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    return {
      valid: isValid,
      totalRecords,
      validTables,
      errorTables,
      size: summary.backup_size_bytes,
      created: metadata.created_at
    };

  } catch (error) {
    console.error(`❌ Eroare la verificarea backup-ului: ${error.message}`);
    return {
      valid: false,
      error: error.message
    };
  }
}

// Afișează statistici generale
function showGeneralStats() {
  const backups = listBackups();

  if (backups.length === 0) {
    console.log('❌ Nu există backup-uri disponibile!');
    return;
  }

  console.log('📊 STATISTICI GENERALE BACKUP-URI');
  console.log('================================');

  let totalSize = 0;
  let validBackups = 0;
  let invalidBackups = 0;

  backups.forEach(backup => {
    totalSize += backup.size;
    console.log(`\n📁 ${backup.name}`);
    console.log(`   📅 Creat: ${backup.created.toLocaleString()}`);
    console.log(`   💾 Mărime: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);

    // Verifică rapid integritatea
    try {
      const content = fs.readFileSync(backup.path, 'utf8');
      const data = JSON.parse(content);

      if (data.metadata && data.tables && data.summary) {
        console.log(`   ✅ Structură validă`);
        validBackups++;
      } else {
        console.log(`   ❌ Structură invalidă`);
        invalidBackups++;
      }
    } catch (error) {
      console.log(`   ❌ Eroare JSON: ${error.message}`);
      invalidBackups++;
    }
  });

  console.log('\n📈 SUMAR GENERAL:');
  console.log(`   📁 Total backup-uri: ${backups.length}`);
  console.log(`   ✅ Backup-uri valide: ${validBackups}`);
  console.log(`   ❌ Backup-uri invalide: ${invalidBackups}`);
  console.log(`   💾 Mărime totală: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   📅 Cel mai recent: ${backups[0].created.toLocaleString()}`);
  console.log(`   📅 Cel mai vechi: ${backups[backups.length - 1].created.toLocaleString()}`);
}

// Funcția principală
async function main() {
  const backupName = process.argv[2];

  if (!backupName) {
    showGeneralStats();
    console.log('\n📋 Folosire:');
    console.log('  node verify-backup.js                    # Statistici generale');
    console.log('  node verify-backup.js [nume-backup]      # Verifică backup specific');
    console.log('\n📁 Backup-uri disponibile:');
    listBackups().forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup.name}`);
    });
    return;
  }

  // Găsește backup-ul specificat
  const backups = listBackups();
  const backup = backups.find(b => b.name === backupName);

  if (!backup) {
    console.error(`❌ Backup-ul "${backupName}" nu a fost găsit!`);
    console.log('\n📁 Backup-uri disponibile:');
    backups.forEach((b, index) => {
      console.log(`  ${index + 1}. ${b.name}`);
    });
    process.exit(1);
  }

  // Verifică backup-ul specificat
  console.log('🔍 VERIFICARE BACKUP DETALIATĂ');
  console.log('==============================');

  const result = verifyBackup(backup.path);

  if (result.valid) {
    console.log('\n🎉 BACKUP VALID - Poate fi folosit pentru restore!');
  } else {
    console.log('\n❌ BACKUP INVALID - Nu este sigur să-l folosești pentru restore!');
    if (result.error) {
      console.log(`   Eroare: ${result.error}`);
    }
  }
}

// Rulează scriptul
main().catch(console.error);
