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
  administrare_url?: string;
  description?: string;
  image_url?: string;
  website?: string;
  phone?: string;
  youtube_channel?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FishingLocation {
  id: string;
  name: string;
  coords: [number, number];
  type: 'river' | 'lake' | 'pond' | 'private_pond' | 'balti_salbatic' | 'maritime' | 'fluviu';
  subtitle?: string;
  administrare?: string;
  administrare_url?: string;
  description: string;
  county: string;
  region: string;
  website?: string;
  phone?: string;
  youtube_channel?: string;
  species: string[];
  facilities: string[];
  access: 'usor' | 'moderat' | 'dificil';
  parking: boolean;
  camping: boolean;
  recordCount: number;
  lastRecord?: string;
  imageUrl?: string;
}

// Minimal marker data for map rendering (performance optimization)
export interface FishingMarker {
  id: string;
  name: string;
  coords: [number, number];
  type: 'river' | 'lake' | 'pond' | 'private_pond' | 'balti_salbatic' | 'maritime' | 'fluviu';
  county: string;
  region: string;
}

// Convertește tipul din baza de date la tipul din aplicație
const convertType = (dbType: string): FishingLocation['type'] => {
  switch (dbType) {
    case 'lac': return 'lake';           // Lacuri mari
    case 'rau': return 'river';          // Râuri
    case 'fluviu': return 'fluviu';     // Fluvii
    case 'balti_private': return 'private_pond'; // Bălți private
    case 'balti_salbatic': return 'balti_salbatic'; // Bălți sălbatice
    case 'mare': return 'maritime';      // Pescuit în mare
    case 'delta': return 'maritime';     // Delta Dunării
    default: return 'lake';
  }
};

// Convertește o locație din formatul bazei de date la formatul aplicației
const convertLocation = (dbLocation: DatabaseFishingLocation): FishingLocation => {
  const lat = dbLocation.latitude;
  const lng = dbLocation.longitude;

  // Verifică dacă coordonatele sunt valide
  if (!lat || !lng || lat < 43 || lat > 48 || lng < 20 || lng > 30) {
    console.warn(`Invalid coords for ${dbLocation.name}: (${lat}, ${lng}), using default`);
    return {
      id: dbLocation.id,
      name: dbLocation.name,
      coords: [25.0, 45.0], // Centrul României
      type: convertType(dbLocation.type),
      subtitle: dbLocation.subtitle,
      administrare: dbLocation.administrare,
      administrare_url: dbLocation.administrare_url,
      description: dbLocation.description || '',
      county: dbLocation.county,
      region: dbLocation.region,
      website: dbLocation.website,
      phone: dbLocation.phone,
      youtube_channel: dbLocation.youtube_channel,
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
    administrare_url: dbLocation.administrare_url,
    description: dbLocation.description || '',
    county: dbLocation.county,
    region: dbLocation.region,
    website: dbLocation.website,
    phone: dbLocation.phone,
    youtube_channel: dbLocation.youtube_channel,
    species: [], // Vom adăuga speciile mai târziu
    facilities: [], // Vom adăuga facilitățile mai târziu
    access: 'usor', // Default
    parking: true, // Default
    camping: false, // Default
    recordCount: 0, // Vom calcula mai târziu
    imageUrl: dbLocation.image_url
  };
};

// PERFORMANCE: Load only minimal marker data (id, name, coords, type, county, region)
export const loadFishingMarkers = async (): Promise<FishingMarker[]> => {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('id, name, type, county, region, latitude, longitude')
      .order('name');

    if (error) {
      console.error('❌ Error loading fishing markers:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Convert to minimal marker format
    const markers: FishingMarker[] = data.map(dbLocation => {
      const lat = dbLocation.latitude;
      const lng = dbLocation.longitude;

      // Validate coordinates
      if (!lat || !lng || lat < 43 || lat > 48 || lng < 20 || lng > 30) {
        console.warn(`Invalid coords for ${dbLocation.name}: (${lat}, ${lng}), using default`);
        return {
          id: dbLocation.id,
          name: dbLocation.name,
          coords: [25.0, 45.0] as [number, number],
          type: convertType(dbLocation.type),
          county: dbLocation.county,
          region: dbLocation.region
        };
      }

      return {
        id: dbLocation.id,
        name: dbLocation.name,
        coords: [lng, lat] as [number, number],
        type: convertType(dbLocation.type),
        county: dbLocation.county,
        region: dbLocation.region
      };
    });

    console.log(`✅ Loaded ${markers.length} markers (minimal data for performance)`);
    return markers;
  } catch (error) {
    console.error('❌ Error in loadFishingMarkers:', error);
    return [];
  }
};

// PERFORMANCE: Load full location details on-demand (when user clicks a marker)
export const getLocationDetails = async (id: string): Promise<FishingLocation | null> => {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error loading location details:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return convertLocation(data);
  } catch (error) {
    console.error('❌ Error in getLocationDetails:', error);
    return null;
  }
};

// Încarcă toate locațiile din baza de date
export const loadFishingLocations = async (): Promise<FishingLocation[]> => {
  try {

    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error loading fishing locations:', error);
      return [];
    }

    if (!data) {
      return [];
    }


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

// Caută locații după nume
export const searchFishingLocations = async (query: string): Promise<FishingLocation[]> => {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);

    if (error) {
      console.error('❌ Error searching fishing locations:', error);
      return [];
    }

    if (!data) return [];

    return data.map(convertLocation);
  } catch (error) {
    console.error('❌ Error in searchFishingLocations:', error);
    return [];
  }
};
