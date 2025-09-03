// România - Județe și orașe
export interface County {
  id: string;
  name: string;
  cities: string[];
}

export const ROMANIA_COUNTIES: County[] = [
  {
    id: "alba",
    name: "Alba",
    cities: ["Alba Iulia", "Aiud", "Blaj", "Câmpeni", "Cugir", "Ocna Mureș", "Sebeș", "Teiuș"]
  },
  {
    id: "arad",
    name: "Arad",
    cities: ["Arad", "Chișineu-Criș", "Curtici", "Ineu", "Lipova", "Nădlac", "Pecica", "Sântana"]
  },
  {
    id: "arges",
    name: "Argeș",
    cities: ["Pitești", "Câmpulung", "Curtea de Argeș", "Mioveni", "Ștefănești", "Topoloveni"]
  },
  {
    id: "bacau",
    name: "Bacău",
    cities: ["Bacău", "Comănești", "Dărmănești", "Moinești", "Onești", "Slănic-Moldova", "Târgu Ocna"]
  },
  {
    id: "bihor",
    name: "Bihor",
    cities: ["Oradea", "Aleșd", "Beiuș", "Marghita", "Salonta", "Valea lui Mihai"]
  },
  {
    id: "bistrita-nasaud",
    name: "Bistrița-Năsăud",
    cities: ["Bistrița", "Beclean", "Năsăud", "Sângeorz-Băi"]
  },
  {
    id: "botosani",
    name: "Botoșani",
    cities: ["Botoșani", "Bucecea", "Darabani", "Dorohoi", "Flămânzi", "Săveni", "Ștefănești"]
  },
  {
    id: "brasov",
    name: "Brașov",
    cities: ["Brașov", "Codlea", "Făgăraș", "Ghimbav", "Predeal", "Râșnov", "Rupea", "Săcele", "Victoria", "Zărnești"]
  },
  {
    id: "braila",
    name: "Brăila",
    cities: ["Brăila", "Faurei", "Ianca", "Însurăței"]
  },
  {
    id: "buzau",
    name: "Buzău",
    cities: ["Buzău", "Nehoiu", "Pogoanele", "Râmnicu Sărat"]
  },
  {
    id: "calarasi",
    name: "Călărași",
    cities: ["Călărași", "Budești", "Fundulea", "Lehliu Gară", "Oltenița"]
  },
  {
    id: "caras-severin",
    name: "Caraș-Severin",
    cities: ["Reșița", "Anina", "Băile Herculane", "Bocșa", "Caransebeș", "Moldova Nouă", "Oravița", "Oțelu Roșu"]
  },
  {
    id: "cluj",
    name: "Cluj",
    cities: ["Cluj-Napoca", "Câmpia Turzii", "Dej", "Gherla", "Huedin", "Turda"]
  },
  {
    id: "constanta",
    name: "Constanța",
    cities: ["Constanța", "Cernavodă", "Eforie", "Hârșova", "Mangalia", "Medgidia", "Murfatlar", "Năvodari", "Ovidiu", "Techirghiol"]
  },
  {
    id: "covasna",
    name: "Covasna",
    cities: ["Sfântu Gheorghe", "Baraolt", "Covasna", "Întorsura Buzăului", "Târgu Secuiesc"]
  },
  {
    id: "dambovita",
    name: "Dâmbovița",
    cities: ["Târgoviște", "Fieni", "Găești", "Moreni", "Pucioasa", "Titu"]
  },
  {
    id: "dolj",
    name: "Dolj",
    cities: ["Craiova", "Băilești", "Bechet", "Calafat", "Dăbuleni", "Filiași", "Segarcea"]
  },
  {
    id: "galati",
    name: "Galați",
    cities: ["Galați", "Berești", "Tecuci"]
  },
  {
    id: "giurgiu",
    name: "Giurgiu",
    cities: ["Giurgiu", "Bolintin-Vale", "Mihăilești"]
  },
  {
    id: "gorj",
    name: "Gorj",
    cities: ["Târgu Jiu", "Bumbești-Jiu", "Motru", "Novaci", "Rovinari", "Târgu Cărbunești", "Turceni"]
  },
  {
    id: "harghita",
    name: "Harghita",
    cities: ["Miercurea Ciuc", "Băile Tușnad", "Bălan", "Borsec", "Cristuru Secuiesc", "Odorheiu Secuiesc", "Toplița", "Vlăhița"]
  },
  {
    id: "hunedoara",
    name: "Hunedoara",
    cities: ["Deva", "Brad", "Călan", "Hațeg", "Hunedoara", "Lupeni", "Orăștie", "Petrila", "Petroșani", "Simeria", "Uricani", "Vulcan"]
  },
  {
    id: "ialomita",
    name: "Ialomița",
    cities: ["Slobozia", "Amara", "Călărași", "Fetești", "Fierbinți-Târg", "Țăndărei", "Urziceni"]
  },
  {
    id: "iasi",
    name: "Iași",
    cities: ["Iași", "Hârlău", "Pașcani", "Târgu Frumos"]
  },
  {
    id: "ilfov",
    name: "Ilfov",
    cities: ["Buftea", "Bragadiru", "Chitila", "Măgurele", "Otopeni", "Pantelimon", "Popești-Leordeni", "Voluntari"]
  },
  {
    id: "maramures",
    name: "Maramureș",
    cities: ["Baia Mare", "Baia Sprie", "Borșa", "Cavnic", "Sighetu Marmației", "Somcuta Mare", "Târgu Lăpuș", "Tăuții-Măgherăuș", "Ulmeni", "Vișeu de Sus"]
  },
  {
    id: "mehedinti",
    name: "Mehedinți",
    cities: ["Drobeta-Turnu Severin", "Baia de Aramă", "Orșova", "Strehaia", "Vânju Mare"]
  },
  {
    id: "mures",
    name: "Mureș",
    cities: ["Târgu Mureș", "Iernut", "Luduș", "Miercurea Nirajului", "Reghin", "Sighișoara", "Sovata", "Târnăveni", "Ungheni"]
  },
  {
    id: "neamt",
    name: "Neamț",
    cities: ["Piatra Neamț", "Bicaz", "Roznov", "Târgu Neamț"]
  },
  {
    id: "olt",
    name: "Olt",
    cities: ["Slatina", "Balș", "Caracal", "Corabia", "Drăgănești-Olt", "Piatra-Olt", "Potcoava", "Scornicești"]
  },
  {
    id: "prahova",
    name: "Prahova",
    cities: ["Ploiești", "Azuga", "Băicoi", "Boldești-Scăeni", "Breaza", "Bușteni", "Câmpina", "Comarnic", "Mizil", "Plopeni", "Sinaia", "Slănic", "Urlați", "Vălenii de Munte"]
  },
  {
    id: "salaj",
    name: "Sălaj",
    cities: ["Zalău", "Cehu Silvaniei", "Jibou", "Șimleu Silvaniei"]
  },
  {
    id: "satu-mare",
    name: "Satu Mare",
    cities: ["Satu Mare", "Carei", "Livada", "Negrești-Oaș", "Tășnad"]
  },
  {
    id: "sibiu",
    name: "Sibiu",
    cities: ["Sibiu", "Agnita", "Avrig", "Cisnădie", "Copșa Mică", "Dumbrăveni", "Mediaș", "Miercurea Sibiului", "Ocna Sibiului", "Săliște", "Tălmaciu"]
  },
  {
    id: "suceava",
    name: "Suceava",
    cities: ["Suceava", "Broșteni", "Câmpulung Moldovenesc", "Fălticeni", "Gura Humorului", "Liteni", "Milișăuți", "Rădăuți", "Salcea", "Siret", "Solca", "Vicovu de Sus", "Vatra Dornei"]
  },
  {
    id: "teleorman",
    name: "Teleorman",
    cities: ["Alexandria", "Roșiori de Vede", "Turnu Măgurele", "Videle", "Zimnicea"]
  },
  {
    id: "timis",
    name: "Timiș",
    cities: ["Timișoara", "Buziaș", "Ciacova", "Deta", "Făget", "Gătaia", "Jimbolia", "Lugoj", "Recaș", "Sânnicolau Mare"]
  },
  {
    id: "tulcea",
    name: "Tulcea",
    cities: ["Tulcea", "Babadag", "Isaccea", "Măcin", "Sulina"]
  },
  {
    id: "vaslui",
    name: "Vaslui",
    cities: ["Vaslui", "Bârlad", "Huși", "Murgeni", "Negrești"]
  },
  {
    id: "valcea",
    name: "Vâlcea",
    cities: ["Râmnicu Vâlcea", "Băbeni", "Băile Govora", "Băile Olănești", "Brezoi", "Călimănești", "Drăgășani", "Horezu", "Ocnele Mari", "Râmnicu Vâlcea"]
  },
  {
    id: "vrancea",
    name: "Vrancea",
    cities: ["Focșani", "Adjud", "Mărășești", "Odobești", "Panciu"]
  },
  {
    id: "bucuresti",
    name: "București",
    cities: ["Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6"]
  }
];

// Helper functions for search
export const searchCounties = (query: string): County[] => {
  if (!query.trim()) return ROMANIA_COUNTIES;

  const lowercaseQuery = query.toLowerCase();
  return ROMANIA_COUNTIES.filter(county =>
    county.name.toLowerCase().includes(lowercaseQuery)
  );
};

export const searchCities = (countyId: string, query: string): string[] => {
  const county = ROMANIA_COUNTIES.find(c => c.id === countyId);
  if (!county) return [];

  if (!query.trim()) return county.cities;

  const lowercaseQuery = query.toLowerCase();
  return county.cities.filter(city =>
    city.toLowerCase().includes(lowercaseQuery)
  );
};

export const getCountyById = (countyId: string): County | undefined => {
  return ROMANIA_COUNTIES.find(c => c.id === countyId);
};
