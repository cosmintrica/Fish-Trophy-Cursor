#!/usr/bin/env node

/**
 * BACKUP SCRIPT PENTRU FISH TROPHY DATABASE
 *
 * ⚠️  IMPORTANT: Acest script NU șterge niciodată datele din baza de date!
 * Doar creează backup-uri complete cu toate datele.
 *
 * Folosire:
 * node backup-database.js [nume-backup]
 *
 * Exemplu:
 * node backup-database.js backup-2025-01-15
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurare Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cckytfxrigzkpfkrrqbv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ EROARE: SUPABASE_SERVICE_ROLE_KEY nu este setat!');
  console.log('Setez variabila de mediu:');
  console.log('set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Creează directorul pentru backup-uri
const backupDir = path.join(__dirname, 'database-backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Numele backup-ului
const backupName = process.argv[2] || `backup-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
const backupPath = path.join(backupDir, `${backupName}.json`);

console.log('🔄 Încep backup-ul bazei de date...');
console.log(`📁 Backup va fi salvat în: ${backupPath}`);

async function backupTable(tableName, selectQuery = '*') {
  try {
    console.log(`📊 Backup tabel: ${tableName}...`);

    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery);

    if (error) {
      console.error(`❌ Eroare la backup tabel ${tableName}:`, error.message);
      return { table: tableName, data: [], error: error.message };
    }

    console.log(`✅ ${tableName}: ${data?.length || 0} înregistrări`);
    return { table: tableName, data: data || [], error: null };
  } catch (err) {
    console.error(`❌ Eroare la backup tabel ${tableName}:`, err.message);
    return { table: tableName, data: [], error: err.message };
  }
}

async function backupStorage() {
  try {
    console.log('📁 Backup storage buckets...');

    const buckets = ['avatars', 'thumbnails'];
    const storageData = {};

    for (const bucket of buckets) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list('', { limit: 1000 });

        if (error) {
          console.error(`❌ Eroare la backup bucket ${bucket}:`, error.message);
          storageData[bucket] = { files: [], error: error.message };
        } else {
          console.log(`✅ ${bucket}: ${data?.length || 0} fișiere`);
          storageData[bucket] = { files: data || [], error: null };
        }
      } catch (err) {
        console.error(`❌ Eroare la backup bucket ${bucket}:`, err.message);
        storageData[bucket] = { files: [], error: err.message };
      }
    }

    return storageData;
  } catch (err) {
    console.error('❌ Eroare la backup storage:', err.message);
    return { error: err.message };
  }
}

async function createBackup() {
  try {
    const backupData = {
      metadata: {
        created_at: new Date().toISOString(),
        backup_name: backupName,
        version: '1.0',
        description: 'Backup complet Fish Trophy Database'
      },
      tables: {},
      storage: {},
      summary: {}
    };

    // Backup toate tabelele importante
    const tables = [
      'profiles',
      'fishing_locations',
      'fish_species',
      'records',
      'record_images',
      'record_videos',
      'fishing_shops',
      'parking_spots',
      'educational_content',
      'analytics_events',
      'user_sessions',
      'admin_actions'
    ];

    let totalRecords = 0;
    let successfulTables = 0;

    for (const table of tables) {
      const result = await backupTable(table);
      backupData.tables[table] = result;

      if (!result.error) {
        totalRecords += result.data.length;
        successfulTables++;
      }
    }

    // Backup storage
    backupData.storage = await backupStorage();

    // Summary
    backupData.summary = {
      total_tables: tables.length,
      successful_tables: successfulTables,
      total_records: totalRecords,
      backup_size_bytes: JSON.stringify(backupData).length,
      created_at: new Date().toISOString()
    };

    // Salvează backup-ul
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    console.log('\n🎉 BACKUP COMPLET!');
    console.log(`📁 Fișier: ${backupPath}`);
    console.log(`📊 Tabele: ${successfulTables}/${tables.length}`);
    console.log(`📝 Înregistrări: ${totalRecords}`);
    console.log(`💾 Mărime: ${(backupData.summary.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`);

    return backupData;

  } catch (error) {
    console.error('❌ EROARE CRITICĂ la backup:', error.message);
    process.exit(1);
  }
}

// Rulează backup-ul
createBackup().catch(console.error);
