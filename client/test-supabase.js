// Test Supabase connection and check fishing locations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cckytfxrigzkpfkrrqbv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test basic connection - get all locations
    const { data, error, count } = await supabase
      .from('fishing_locations')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Connection successful!');
    console.log('📊 Total fishing locations count:', count);
    console.log('📍 First 10 locations:');
    
    if (data && data.length > 0) {
      data.slice(0, 10).forEach(loc => {
        console.log(`  - ${loc.name} (${loc.type}) in ${loc.county}, ${loc.region}`);
      });
    } else {
      console.log('⚠️ No fishing locations found in database!');
      console.log('🔄 Need to run the SQL script to insert locations...');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();