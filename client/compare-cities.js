// Comparare orașe din baza de date cu lista completă
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

// Lista completă de orașe din România
const completeCitiesList = [
  'Abrud', 'Adjud', 'Agnita', 'Aiud', 'Alba Iulia', 'Aleșd', 'Alexandria', 'Amara', 'Anina', 'Aninoasa',
  'Arad', 'Ardud', 'Avrig', 'Azuga', 'Babadag', 'Băbeni', 'Bacău', 'Baia de Aramă', 'Baia de Arieș', 'Baia Mare',
  'Baia Sprie', 'Băicoi', 'Băile Govora', 'Băile Herculane', 'Băile Olănești', 'Băile Tușnad', 'Băilești', 'Bălan', 'Bălcești', 'Balș',
  'Baraolt', 'Bârlad', 'Bechet', 'Beclean', 'Beiuș', 'Berbești', 'Berești', 'Bicaz', 'Bistrița', 'Blaj',
  'Bocșa', 'Boldești-Scăeni', 'Bolintin-Vale', 'Borșa', 'Borsec', 'Botoșani', 'Brad', 'Bragadiru', 'Brăila', 'Brașov',
  'Breaza', 'Brezoi', 'Broșteni', 'Bucecea', 'București', 'Budești', 'Buftea', 'Buhuși', 'Bumbești-Jiu', 'Bușteni',
  'Buzău', 'Buziaș', 'Cajvana', 'Calafat', 'Călan', 'Călărași', 'Călimănești', 'Câmpeni', 'Câmpia Turzii', 'Câmpina',
  'Câmpulung Moldovenesc', 'Câmpulung', 'Caracal', 'Caransebeș', 'Carei', 'Cavnic', 'Căzănești', 'Cehu Silvaniei', 'Cernavodă', 'Chișineu-Criș',
  'Chitila', 'Ciacova', 'Cisnădie', 'Cluj-Napoca', 'Codlea', 'Comănești', 'Comarnic', 'Constanța', 'Copșa Mică', 'Corabia',
  'Costești', 'Covasna', 'Craiova', 'Cristuru Secuiesc', 'Cugir', 'Curtea de Argeș', 'Curtici', 'Dăbuleni', 'Darabani', 'Dărmănești',
  'Dej', 'Deta', 'Deva', 'Dolhasca', 'Dorohoi', 'Drăgănești-Olt', 'Drăgășani', 'Dragomirești', 'Drobeta-Turnu Severin', 'Dumbrăveni',
  'Eforie', 'Făgăraș', 'Făget', 'Fălticeni', 'Făurei', 'Fetești', 'Fieni', 'Fierbinți-Târg', 'Filiași', 'Flămânzi',
  'Focșani', 'Frasin', 'Fundulea', 'Găești', 'Galați', 'Gătaia', 'Geoagiu', 'Gheorgheni', 'Gherla', 'Ghimbav',
  'Giurgiu', 'Gura Humorului', 'Hârlău', 'Hârșova', 'Hațeg', 'Horezu', 'Huedin', 'Hunedoara', 'Huși', 'Ianca',
  'Iași', 'Iernut', 'Ineu', 'Însurăței', 'Întorsura Buzăului', 'Isaccea', 'Jibou', 'Jimbolia', 'Lehliu Gară', 'Lipova',
  'Liteni', 'Livada', 'Luduș', 'Lugoj', 'Lupeni', 'Măcin', 'Măgurele', 'Mangalia', 'Mărășești', 'Marghita',
  'Medgidia', 'Mediaș', 'Miercurea Ciuc', 'Miercurea Nirajului', 'Miercurea Sibiului', 'Mihăilești', 'Milișăuți', 'Mioveni', 'Mizil', 'Moinești',
  'Moldova Nouă', 'Moreni', 'Motru', 'Murfatlar', 'Murgeni', 'Nădlac', 'Năsăud', 'Năvodari', 'Negrești', 'Negrești-Oaș',
  'Negru Vodă', 'Nehoiu', 'Novaci', 'Nucet', 'Ocna Mureș', 'Ocna Sibiului', 'Ocnele Mari', 'Odobești', 'Odorheiu Secuiesc', 'Oltenița',
  'Onești', 'Oradea', 'Orăștie', 'Oravița', 'Orșova', 'Oțelu Roșu', 'Otopeni', 'Ovidiu', 'Panciu', 'Pâncota',
  'Pantelimon', 'Pașcani', 'Pătârlagele', 'Pecica', 'Petrila', 'Petroșani', 'Piatra Neamț', 'Piatra-Olt', 'Pitești', 'Ploiești',
  'Plopeni', 'Podu Iloaiei', 'Pogoanele', 'Popești-Leordeni', 'Potcoava', 'Predeal', 'Pucioasa', 'Răcari', 'Rădăuți', 'Râmnicu Sărat',
  'Râmnicu Vâlcea', 'Râșnov', 'Recaș', 'Reghin', 'Reșița', 'Roman', 'Roșiorii de Vede', 'Rovinari', 'Roznov', 'Rupea',
  'Săcele', 'Săcueni', 'Salcea', 'Săliște', 'Săliștea de Sus', 'Salonta', 'Sângeorgiu de Pădure', 'Sângeorz-Băi', 'Sânnicolau Mare', 'Sântana',
  'Sărmașu', 'Satu Mare', 'Săveni', 'Scornicești', 'Sebeș', 'Sebiș', 'Segarcea', 'Seini', 'Sfântu Gheorghe', 'Sibiu',
  'Sighetu Marmației', 'Sighișoara', 'Simeria', 'Șimleu Silvaniei', 'Sinaia', 'Siret', 'Slănic', 'Slănic-Moldova', 'Slatina', 'Slobozia',
  'Solca', 'Șomcuta Mare', 'Sovata', 'Ștefănești, Argeș', 'Ștefănești, Botoșani', 'Ștei', 'Strehaia', 'Suceava', 'Sulina', 'Tălmaciu',
  'Țăndărei', 'Târgoviște', 'Târgu Bujor', 'Târgu Cărbunești', 'Târgu Frumos', 'Târgu Jiu', 'Târgu Lăpuș', 'Târgu Mureș', 'Târgu Neamț', 'Târgu Ocna',
  'Târgu Secuiesc', 'Târnăveni', 'Tășnad', 'Tăuții-Măgherăuș', 'Techirghiol', 'Tecuci', 'Teiuș', 'Țicleni', 'Timișoara', 'Tismana',
  'Titu', 'Toplița', 'Topoloveni', 'Tulcea', 'Turceni', 'Turda', 'Turnu Măgurele', 'Ulmeni', 'Ungheni', 'Uricani',
  'Urlați', 'Urziceni', 'Valea lui Mihai', 'Vălenii de Munte', 'Vânju Mare', 'Vașcău', 'Vaslui', 'Vatra Dornei', 'Vicovu de Sus', 'Victoria',
  'Videle', 'Vișeu de Sus', 'Vlăhița', 'Voluntari', 'Vulcan', 'Zalău', 'Zărnești', 'Zimnicea', 'Zlatna'
];

async function compareCities() {
  console.log('🔍 Comparare orașe...\n');
  
  // Obține orașele din baza de date
  const { data: dbCities, error } = await supabase
    .from('cities')
    .select('name')
    .order('name');
  
  if (error) {
    console.log('❌ Eroare:', error.message);
    return;
  }
  
  const dbCityNames = dbCities.map(city => city.name);
  
  console.log(`📊 Orașe în baza de date: ${dbCityNames.length}`);
  console.log(`📊 Orașe în lista completă: ${completeCitiesList.length}`);
  
  // Găsește orașele care lipsesc din baza de date
  const missingCities = completeCitiesList.filter(city => !dbCityNames.includes(city));
  
  console.log(`\n❌ Orașe care lipsesc din baza de date: ${missingCities.length}`);
  missingCities.forEach(city => {
    console.log(`   - ${city}`);
  });
  
  // Găsește orașele din baza de date care nu sunt în lista completă
  const extraCities = dbCityNames.filter(city => !completeCitiesList.includes(city));
  
  console.log(`\n➕ Orașe din baza de date care nu sunt în lista completă: ${extraCities.length}`);
  extraCities.forEach(city => {
    console.log(`   - ${city}`);
  });
  
  console.log(`\n📊 Diferență: ${completeCitiesList.length - dbCityNames.length} orașe lipsesc`);
}

compareCities();
