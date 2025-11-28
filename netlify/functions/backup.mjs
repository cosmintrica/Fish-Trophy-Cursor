// Backup API - Create database backup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
});

const ok = (data, init = {}) => ({
  statusCode: 200,
  headers: cors(),
  body: JSON.stringify(data),
  ...init
});

const bad = (message, status = 400) => ({
  statusCode: status,
  headers: cors(),
  body: JSON.stringify({ success: false, error: message })
});

async function backupTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      return { table: tableName, data: [], error: error.message };
    }

    return { table: tableName, data: data || [], error: null };
  } catch (err) {
    return { table: tableName, data: [], error: err.message };
  }
}

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return ok({});
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return bad('Method not allowed', 405);
  }

  try {
    // Verify admin (optional - you can add auth check here)
    // For now, we rely on Netlify function being protected by environment

    console.log('🔄 Starting database backup...');

    const backupData = {
      metadata: {
        created_at: new Date().toISOString(),
        backup_name: `backup-${new Date().toISOString().split('T')[0]}-${Date.now()}`,
        version: '1.0',
        description: 'Backup complet Fish Trophy Database'
      },
      tables: {},
      summary: {}
    };

    // Lista tabelelor importante
    const tables = [
      'profiles',
      'fishing_locations',
      'fish_species',
      'records',
      'user_gear',
      'catches',
      'catch_likes',
      'catch_comments',
      'private_messages'
    ];

    let totalRecords = 0;
    let successfulTables = 0;

    // Backup fiecare tabel
    for (const table of tables) {
      console.log(`📊 Backing up table: ${table}...`);
      const result = await backupTable(table);
      backupData.tables[table] = result;

      if (!result.error) {
        totalRecords += result.data.length;
        successfulTables++;
        console.log(`✅ ${table}: ${result.data.length} records`);
      } else {
        console.error(`❌ ${table}: ${result.error}`);
      }
    }

    // Summary
    backupData.summary = {
      total_tables: tables.length,
      successful_tables: successfulTables,
      total_records: totalRecords,
      backup_size_bytes: JSON.stringify(backupData).length,
      created_at: new Date().toISOString()
    };

    console.log('🎉 Backup completed!');
    console.log(`📊 Tables: ${successfulTables}/${tables.length}`);
    console.log(`📝 Records: ${totalRecords}`);
    console.log(`💾 Size: ${(backupData.summary.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`);

    return ok({
      success: true,
      backup: backupData,
      message: 'Backup creat cu succes!'
    });

  } catch (error) {
    console.error('❌ Backup error:', error);
    return bad(error.message || 'Eroare la crearea backup-ului', 500);
  }
};

