// Verificare completă baza de date
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

async function checkDatabase() {
  console.log('🔍 Verificare completă baza de date...\n');
  
  // Verifică tabelele
  const tables = ['profiles', 'counties', 'cities', 'fish_species', 'fishing_locations', 'records'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} rânduri`);
        if (table === 'profiles' && data && data.length > 0) {
          console.log(`   Utilizatori: ${data.map(u => u.email).join(', ')}`);
        }
        if (table === 'fish_species' && data && data.length > 0) {
          console.log(`   Specii: ${data.map(s => s.name).join(', ')}`);
        }
        if (table === 'counties' && data && data.length > 0) {
          console.log(`   Județe: ${data.map(c => c.name).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n🔍 Verificare legături...');
  
  // Verifică legătura profiles -> counties
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, county_id, counties(name)')
      .limit(5);
    
    if (error) {
      console.log(`❌ Legătura profiles->counties: ${error.message}`);
    } else {
      console.log(`✅ Legătura profiles->counties funcționează`);
    }
  } catch (err) {
    console.log(`❌ Legătura profiles->counties: ${err.message}`);
  }
  
  // Verifică legătura cities -> counties
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('name, counties(name)')
      .limit(5);
    
    if (error) {
      console.log(`❌ Legătura cities->counties: ${error.message}`);
    } else {
      console.log(`✅ Legătura cities->counties funcționează`);
    }
  } catch (err) {
    console.log(`❌ Legătura cities->counties: ${err.message}`);
  }
}

checkDatabase();
