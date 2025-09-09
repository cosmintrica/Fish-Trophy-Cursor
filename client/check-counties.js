// Verificare județe din baza de date
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

// Lista oficială de județe din România (41 + București = 42)
const officialCounties = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 'București',
  'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
  'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț',
  'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea',
  'Vaslui', 'Vrancea'
];

async function checkCounties() {
  console.log('🔍 Verificare județe din baza de date...\n');
  
  // Obține județele din baza de date
  const { data: dbCounties, error } = await supabase
    .from('counties')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.log('❌ Eroare:', error.message);
    return;
  }
  
  console.log(`📊 Județe în baza de date: ${dbCounties.length}`);
  console.log(`📊 Județe oficiale: ${officialCounties.length}`);
  
  // Verifică dacă toate județele oficiale sunt în baza de date
  const dbCountyNames = dbCounties.map(county => county.name);
  const missingCounties = officialCounties.filter(county => !dbCountyNames.includes(county));
  
  if (missingCounties.length > 0) {
    console.log(`\n❌ Județe care lipsesc din baza de date: ${missingCounties.length}`);
    missingCounties.forEach(county => {
      console.log(`   - ${county}`);
    });
  } else {
    console.log('\n✅ Toate județele oficiale sunt în baza de date!');
  }
  
  // Verifică dacă există județe extra în baza de date
  const extraCounties = dbCountyNames.filter(county => !officialCounties.includes(county));
  
  if (extraCounties.length > 0) {
    console.log(`\n➕ Județe extra în baza de date: ${extraCounties.length}`);
    extraCounties.forEach(county => {
      console.log(`   - ${county}`);
    });
  }
  
  // Afișează toate județele din baza de date
  console.log('\n📍 Județe în baza de date:');
  dbCounties.forEach(county => {
    console.log(`   ${county.id}: ${county.name}`);
  });
  
  console.log(`\n📊 Total județe în baza de date: ${dbCounties.length}`);
  console.log(`📊 Total județe oficiale: ${officialCounties.length}`);
  console.log(`📊 Diferență: ${dbCounties.length - officialCounties.length}`);
}

checkCounties();
