// Verificare orașe din baza de date
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

async function checkCities() {
  console.log('🔍 Verificare orașe din baza de date...\n');
  
  // Verifică județele
  const { data: counties, error: countiesError } = await supabase
    .from('counties')
    .select('id, name')
    .order('name');
  
  if (countiesError) {
    console.log('❌ Eroare la județe:', countiesError.message);
    return;
  }
  
  console.log(`✅ Județe: ${counties.length}`);
  counties.forEach(county => {
    console.log(`   ${county.id}: ${county.name}`);
  });
  
  console.log('\n🔍 Verificare orașe...');
  
  // Verifică orașele
  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select('name, counties(name, id)')
    .order('name');
  
  if (citiesError) {
    console.log('❌ Eroare la orașe:', citiesError.message);
    return;
  }
  
  console.log(`✅ Orașe: ${cities.length}`);
  
  // Grupează orașele pe județe
  const citiesByCounty = {};
  cities.forEach(city => {
    const countyName = city.counties?.name || 'Necunoscut';
    if (!citiesByCounty[countyName]) {
      citiesByCounty[countyName] = [];
    }
    citiesByCounty[countyName].push(city.name);
  });
  
  // Afișează orașele pe județe
  Object.keys(citiesByCounty).sort().forEach(countyName => {
    console.log(`\n📍 ${countyName} (${citiesByCounty[countyName].length} orașe):`);
    citiesByCounty[countyName].forEach(cityName => {
      console.log(`   - ${cityName}`);
    });
  });
  
  console.log(`\n📊 Total orașe în baza de date: ${cities.length}`);
  console.log(`📊 Total județe în baza de date: ${counties.length}`);
}

checkCities();
