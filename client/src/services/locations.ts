export interface FishingLocation {
  id: string;
  name: string;
  coords: [number, number];
  type: 'maritim' | 'delta' | 'lac' | 'lac_munte' | 'rau_munte' | 'rau_plan' | 'balta' | 'lac_artificial';
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

// Mock data - în viitor va veni din API
export const fishingLocations: FishingLocation[] = [
  {
    id: '1',
    name: 'Marea Neagră - Constanța',
    coords: [44.1733, 28.6383],
    type: 'maritim',
    description: 'Pescuit în larg și de coastă. Specii: știucă de mare, biban de mare, cefal, macrou.',
    county: 'Constanța',
    region: 'Dobrogea',
    species: ['știucă de mare', 'biban de mare', 'cefal', 'macrou'],
    facilities: ['chei', 'restaurante', 'hoteluri'],
    access: 'usor',
    parking: true,
    camping: false,
    recordCount: 15
  },
  {
    id: '2',
    name: 'Delta Dunării - Sfântu Gheorghe',
    coords: [45.4167, 29.2833],
    type: 'delta',
    description: 'Pescuit în canale și lacuri. Specii: crap, știucă, biban, caras, lin.',
    county: 'Tulcea',
    region: 'Dobrogea',
    species: ['crap', 'știucă', 'biban', 'caras', 'lin'],
    facilities: ['cabane', 'bărcuțe', 'ghizi'],
    access: 'moderat',
    parking: true,
    camping: true,
    recordCount: 28
  },
  {
    id: '3',
    name: 'Lacul Snagov',
    coords: [44.7167, 26.1833],
    type: 'lac',
    description: 'Lac natural cu pescuit de crap și știucă. Acces ușor din București.',
    county: 'Ilfov',
    region: 'Muntenia',
    species: ['crap', 'știucă', 'biban', 'caras'],
    facilities: ['chei', 'restaurante', 'parcări'],
    access: 'usor',
    parking: true,
    camping: false,
    recordCount: 42
  },
  {
    id: '4',
    name: 'Lacul Bicaz',
    coords: [46.8167, 25.9167],
    type: 'lac_munte',
    description: 'Lac de munte cu pescuit de păstrăv și lipan. Peisaje spectaculoase.',
    county: 'Neamț',
    region: 'Moldova',
    species: ['păstrăv', 'lipan', 'moioagă'],
    facilities: ['cabane', 'trasee', 'vânzători'],
    access: 'moderat',
    parking: true,
    camping: true,
    recordCount: 18
  },
  {
    id: '5',
    name: 'Râul Someș - Cluj',
    coords: [47.1833, 23.9167],
    type: 'rau_munte',
    description: 'Râu de munte cu pescuit de păstrăv și lipan. Trasee de hiking.',
    county: 'Cluj',
    region: 'Transilvania',
    species: ['păstrăv', 'lipan', 'moioagă'],
    facilities: ['trasee', 'cabane', 'parcări'],
    access: 'moderat',
    parking: true,
    camping: true,
    recordCount: 23
  },
  {
    id: '6',
    name: 'Lacul Vidra',
    coords: [45.3667, 26.1667],
    type: 'lac_artificial',
    description: 'Lac artificial cu pescuit de crap și caras. Acces ușor din Argeș.',
    county: 'Argeș',
    region: 'Muntenia',
    species: ['crap', 'caras', 'biban', 'lin'],
    facilities: ['chei', 'restaurante', 'parcări'],
    access: 'usor',
    parking: true,
    camping: false,
    recordCount: 31
  }
];

export const fishingZones: FishingZone[] = [
  {
    id: '1',
    name: 'Zona Marea Neagră',
    coords: [[43.5, 27.5], [43.5, 29.5], [45.5, 29.5], [45.5, 27.5]],
    color: '#3B82F6',
    description: 'Zona de pescuit maritim de la granița cu Bulgaria până la Delta Dunării',
    protected: false
  },
  {
    id: '2',
    name: 'Zona Delta Dunării',
    coords: [[44.5, 28.5], [44.5, 30.5], [46.5, 30.5], [46.5, 28.5]],
    color: '#10B981',
    description: 'Rezervația biosferei Delta Dunării cu canale și lacuri',
    protected: true
  }
];

// Funcții pentru filtrare și căutare
export const filterLocationsByType = (type: FishingLocation['type']) => {
  return fishingLocations.filter(location => location.type === type);
};

export const filterLocationsByCounty = (county: string) => {
  return fishingLocations.filter(location => location.county === county);
};

export const searchLocations = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return fishingLocations.filter(location => 
    location.name.toLowerCase().includes(lowerQuery) ||
    location.county.toLowerCase().includes(lowerQuery) ||
    location.region.toLowerCase().includes(lowerQuery) ||
    location.species.some(species => species.toLowerCase().includes(lowerQuery))
  );
};

export const getLocationById = (id: string) => {
  return fishingLocations.find(location => location.id === id);
};
