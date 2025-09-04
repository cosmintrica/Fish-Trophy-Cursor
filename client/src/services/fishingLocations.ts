import { supabase } from '@/lib/supabase';

export interface DatabaseFishingLocation {
  id: string;
  name: string;
  type: 'lac' | 'rau' | 'fluviu' | 'balti_private' | 'balti_salbatic' | 'mare' | 'delta';
  county: string;
  region: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
  administrare?: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FishingLocation {
  id: string;
  name: string;
  coords: [number, number];
  type: 'river' | 'lake' | 'pond' | 'private_pond' | 'balti_salbatic' | 'maritime';
  subtitle?: string;
  administrare?: string;
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

// Convertește tipul din baza de date la tipul din aplicație
const convertType = (dbType: string): FishingLocation['type'] => {
  switch (dbType) {
    case 'lac': return 'lake';           // Lacuri mari
    case 'rau': return 'river';          // Râuri
    case 'fluviu': return 'river';       // Fluviuri (Dunărea) = râuri
    case 'balti_private': return 'private_pond'; // Bălți private (administrate privat)
    case 'balti_salbatic': return 'balti_salbatic'; // Bălți sălbatice (ANPA, ape necontractate)
    case 'mare': return 'lake';          // Marea Neagră = lacuri
    case 'delta': return 'lake';         // Delta Dunării = lacuri
    default: return 'lake';
  }
};

// Convertește locația din baza de date la formatul aplicației
const convertLocation = (dbLocation: DatabaseFishingLocation): FishingLocation => {
  // Verifică dacă coordonatele sunt valide
  const lat = Number(dbLocation.latitude);
  const lng = Number(dbLocation.longitude);
  
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    console.error('❌ Invalid coordinates for location:', dbLocation.name, 'lat:', lat, 'lng:', lng);
    // Returnează coordonatele default pentru România
    return {
      id: dbLocation.id,
      name: dbLocation.name,
      coords: [25.0, 45.0], // Centrul României
      type: convertType(dbLocation.type),
      subtitle: dbLocation.subtitle,
      administrare: dbLocation.administrare,
      description: dbLocation.description || '',
      county: dbLocation.county,
      region: dbLocation.region,
      species: [],
      facilities: [],
      access: 'usor',
      parking: true,
      camping: false,
      recordCount: 0,
      imageUrl: dbLocation.image_url
    };
  }
  
  return {
    id: dbLocation.id,
    name: dbLocation.name,
    coords: [lng, lat], // Mapbox folosește [lng, lat]
    type: convertType(dbLocation.type),
    subtitle: dbLocation.subtitle,
    administrare: dbLocation.administrare,
    description: dbLocation.description || '',
    county: dbLocation.county,
    region: dbLocation.region,
    species: [], // Vom adăuga speciile mai târziu
    facilities: [], // Vom adăuga facilitățile mai târziu
    access: 'usor', // Default
    parking: true, // Default
    camping: false, // Default
    recordCount: 0, // Vom calcula mai târziu
    imageUrl: dbLocation.image_url
  };
};

// Încarcă toate locațiile din baza de date
export const loadFishingLocations = async (): Promise<FishingLocation[]> => {
  try {
    console.log('🔄 Loading fishing locations from database...');
    
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error loading fishing locations:', error);
      return [];
    }

    if (!data) {
      console.log('⚠️ No fishing locations found in database');
      return [];
    }

    console.log(`✅ Loaded ${data.length} fishing locations from database`);
    
    // Convertește locațiile la formatul aplicației
    const locations = data.map(convertLocation);
    
    return locations;
  } catch (error) {
    console.error('❌ Error in loadFishingLocations:', error);
    return [];
  }
};

// Încarcă locațiile filtrate după tip
export const loadFishingLocationsByType = async (type: string): Promise<FishingLocation[]> => {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .eq('type', type)
      .order('name');

    if (error) {
      console.error('❌ Error loading fishing locations by type:', error);
      return [];
    }

    if (!data) return [];

    return data.map(convertLocation);
  } catch (error) {
    console.error('❌ Error in loadFishingLocationsByType:', error);
    return [];
  }
};

// Încarcă locațiile filtrate după județ
export const loadFishingLocationsByCounty = async (county: string): Promise<FishingLocation[]> => {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .eq('county', county)
      .order('name');

    if (error) {
      console.error('❌ Error loading fishing locations by county:', error);
      return [];
    }

    if (!data) return [];

    return data.map(convertLocation);
  } catch (error) {
    console.error('❌ Error in loadFishingLocationsByCounty:', error);
    return [];
  }
};

// Încarcă locațiile filtrate după regiune
export const loadFishingLocationsByRegion = async (region: string): Promise<FishingLocation[]> => {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .eq('region', region)
      .order('name');

    if (error) {
      console.error('❌ Error loading fishing locations by region:', error);
      return [];
    }

    if (!data) return [];

    return data.map(convertLocation);
  } catch (error) {
    console.error('❌ Error in loadFishingLocationsByRegion:', error);
    return [];
  }
};
