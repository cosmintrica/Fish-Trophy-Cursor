// Verificare structura tabelei records
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

async function checkRecordsStructure() {
  console.log('🔍 Verificare structura tabelei records...\n');
  
  try {
    // Verifică structura tabelei records
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Eroare la records:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Structura tabelei records:');
      const record = data[0];
      Object.keys(record).forEach(key => {
        console.log(`   - ${key}: ${typeof record[key]}`);
      });
    } else {
      console.log('⚠️ Tabela records este goală');
    }
    
    // Verifică toate tabelele
    const tables = ['profiles', 'counties', 'cities', 'fish_species', 'fishing_locations', 'records'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count} rânduri`);
          if (data && data.length > 0) {
            console.log(`   Coloane: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Eroare generală:', error.message);
  }
}

checkRecordsStructure();
