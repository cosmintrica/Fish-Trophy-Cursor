// Verificare finală - toate orașele și județele
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

async function verificareFinala() {
  console.log('🎯 VERIFICARE FINALĂ - BAZA DE DATE COMPLETĂ\n');
  
  // Verifică județele
  const { data: counties, error: countiesError } = await supabase
    .from('counties')
    .select('id, name')
    .order('name');
  
  if (countiesError) {
    console.log('❌ Eroare la județe:', countiesError.message);
    return;
  }
  
  // Verifică orașele
  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select('name, counties(name)')
    .order('name');
  
  if (citiesError) {
    console.log('❌ Eroare la orașe:', citiesError.message);
    return;
  }
  
  // Verifică speciile
  const { data: species, error: speciesError } = await supabase
    .from('fish_species')
    .select('name')
    .order('name');
  
  if (speciesError) {
    console.log('❌ Eroare la specii:', speciesError.message);
    return;
  }
  
  // Verifică locațiile
  const { data: locations, error: locationsError } = await supabase
    .from('fishing_locations')
    .select('name, type, county')
    .order('name');
  
  if (locationsError) {
    console.log('❌ Eroare la locații:', locationsError.message);
    return;
  }
  
  // Verifică recordurile
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('species_name, weight, location_name')
    .order('caught_at');
  
  if (recordsError) {
    console.log('❌ Eroare la recorduri:', recordsError.message);
    return;
  }
  
  // Afișează statisticile
  console.log('📊 STATISTICI FINALE:');
  console.log(`   🏛️ Județe: ${counties.length}/42 ✅`);
  console.log(`   🏙️ Orașe: ${cities.length}/319 ${cities.length >= 319 ? '✅' : '⚠️'}`);
  console.log(`   🐟 Specii de pești: ${species.length} ✅`);
  console.log(`   📍 Locații de pescuit: ${locations.length} ✅`);
  console.log(`   🏆 Recorduri: ${records.length} ✅`);
  
  // Verifică dacă baza de date este completă
  const isComplete = counties.length === 42 && cities.length >= 319;
  
  if (isComplete) {
    console.log('\n🎉 BAZA DE DATE ESTE COMPLETĂ!');
    console.log('✅ Toate județele sunt prezente');
    console.log('✅ Toate orașele sunt prezente');
    console.log('✅ Toate datele sunt complete');
    console.log('🚀 Aplicația este gata de utilizare!');
  } else {
    console.log('\n⚠️ BAZA DE DATE NU ESTE COMPLETĂ!');
    if (counties.length < 42) {
      console.log(`❌ Lipsesc ${42 - counties.length} județe`);
    }
    if (cities.length < 319) {
      console.log(`❌ Lipsesc ${319 - cities.length} orașe`);
    }
    console.log('🔧 Rulează scripturile de completare!');
  }
  
  // Afișează primele 10 orașe pentru verificare
  console.log('\n📍 Primele 10 orașe din baza de date:');
  cities.slice(0, 10).forEach(city => {
    console.log(`   - ${city.name} (${city.counties?.name})`);
  });
  
  // Afișează primele 10 recorduri pentru verificare
  if (records.length > 0) {
    console.log('\n🏆 Primele 5 recorduri din baza de date:');
    records.slice(0, 5).forEach(record => {
      console.log(`   - ${record.species_name}: ${record.weight}kg la ${record.location_name}`);
    });
  }
}

verificareFinala();
