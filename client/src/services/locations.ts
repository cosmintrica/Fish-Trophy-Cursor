export interface FishingLocation {
  id: string;
  name: string;
  coords: [number, number];
  type: 'river' | 'lake' | 'pond' | 'private_pond' | 'maritime';
  description: string;
  county: string;
  region: string;
  species: string[];
  facilities: string[];
  access: 'usor' | 'moderat' | 'dificil';
  parking: boolean;
  camping: boolean;
  recordCount: number;
  lastRecord?: string;
  imageUrl?: string;
}

export interface FishingZone {
  id: string;
  name: string;
  coords: [number, number][];
  color: string;
  description: string;
  protected: boolean;
}

export interface FishingShop {
  id: string;
  name: string;
  coords: [number, number];
  address: string;
  city: string;
  county: string;
  phone?: string;
  website?: string;
  description: string;
}

// Magazine de pescuit
export const fishingShops: FishingShop[] = [
  { id: '1', name: "Pescărușul", coords: [44.4262, 26.0155], address: "Strada Pescărușului 15", city: "București", county: "B", phone: "021 123 4567", website: "https://pescarusul.ro", description: "Magazin specializat în echipamente de pescuit" },
  { id: '2', name: "Fish & Tackle", coords: [44.4795, 26.0834], address: "Bulevardul Herăstrău 45", city: "București", county: "B", phone: "021 234 5678", website: "https://fishandtackle.ro", description: "Echipamente profesionale de pescuit" },
  { id: '3', name: "Crap Master", coords: [44.7031, 26.1858], address: "Șoseaua Snagov 123", city: "Snagov", county: "IF", phone: "021 345 6789", website: "https://crapmaster.ro", description: "Specializat în pescuitul de crap" },
  { id: '4', name: "Pescuit Pro", coords: [45.3539, 24.6367], address: "Strada Lacului 67", city: "Călimănești", county: "AG", phone: "0248 456 7890", website: "https://pescuitpro.ro", description: "Echipamente pentru pescuit montan" },
  { id: '5', name: "Delta Fishing", coords: [45.1667, 28.8000], address: "Strada Deltei 89", city: "Tulcea", county: "TL", phone: "0240 567 8901", website: "https://deltafishing.ro", description: "Specializat în pescuitul din Delta Dunării" }
];

// Zone de pescuit
export const fishingZones: FishingZone[] = [
  { id: '2', name: 'Zona Delta Dunării', coords: [[44.5, 28.5], [44.5, 30.5], [46.5, 30.5], [46.5, 28.5]], color: '#10B981', description: 'Rezervația biosferei Delta Dunării cu canale și lacuri', protected: true }
];

// Funcții pentru filtrare și căutare (acum folosesc baza de date)
export const filterLocationsByType = (type: FishingLocation['type']) => {
  // Această funcție va fi înlocuită cu apeluri la baza de date
  console.log('Filtering by type:', type);
  return [];
};

export const filterLocationsByCounty = (county: string) => {
  // Această funcție va fi înlocuită cu apeluri la baza de date
  console.log('Filtering by county:', county);
  return [];
};

export const searchLocations = (query: string) => {
  // Această funcție va fi înlocuită cu apeluri la baza de date
  console.log('Searching for:', query);
  return [];
};

export const getLocationById = (id: string) => {
  // Această funcție va fi înlocuită cu apeluri la baza de date
  console.log('Getting location by id:', id);
  return undefined;
};
