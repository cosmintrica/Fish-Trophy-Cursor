import { supabase } from '@/lib/supabase';

export interface Accommodation {
  id: string;
  name: string;
  accommodation_type: 'pensiune' | 'complex' | 'cazare' | 'hotel' | 'vila';
  address: string;
  city: string;
  county: string;
  region: string;
  latitude: number;
  longitude: number;
  fishing_location_id?: string | null;
  has_fishing_pond: boolean;
  fishing_pond_details?: any; // JSONB
  phone?: string;
  email?: string;
  website?: string;
  facilities?: string[];
  rating: number;
  review_count: number;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Convert accommodation type to display name
export const getAccommodationTypeName = (type: Accommodation['accommodation_type']): string => {
  const names: Record<Accommodation['accommodation_type'], string> = {
    'pensiune': 'Pensiune',
    'complex': 'Complex',
    'cazare': 'Cazare',
    'hotel': 'Hotel',
    'vila': 'Vilă'
  };
  return names[type] || type;
};

// Get accommodation icon
export const getAccommodationIcon = (type: Accommodation['accommodation_type']): string => {
  const icons: Record<Accommodation['accommodation_type'], string> = {
    'pensiune': '🏨',
    'complex': '🏖️',
    'cazare': '🏡',
    'hotel': '🏨',
    'vila': '🏡'
  };
  return icons[type] || '🏨';
};

// Load all accommodations
export const loadAccommodations = async (): Promise<Accommodation[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error loading accommodations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAccommodations:', error);
    return [];
  }
};

// Load accommodations by type
export const loadAccommodationsByType = async (type: Accommodation['accommodation_type']): Promise<Accommodation[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('accommodation_type', type)
      .order('name');

    if (error) {
      console.error('❌ Error loading accommodations by type:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAccommodationsByType:', error);
    return [];
  }
};

// Load accommodations by region
export const loadAccommodationsByRegion = async (region: string): Promise<Accommodation[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('region', region)
      .order('name');

    if (error) {
      console.error('❌ Error loading accommodations by region:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAccommodationsByRegion:', error);
    return [];
  }
};

// Load accommodations near a fishing location
export const loadAccommodationsNearLocation = async (fishingLocationId: string): Promise<Accommodation[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('fishing_location_id', fishingLocationId)
      .order('name');

    if (error) {
      console.error('❌ Error loading accommodations near location:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAccommodationsNearLocation:', error);
    return [];
  }
};

// Load accommodations with fishing pond
export const loadAccommodationsWithPond = async (): Promise<Accommodation[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('has_fishing_pond', true)
      .order('name');

    if (error) {
      console.error('❌ Error loading accommodations with pond:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAccommodationsWithPond:', error);
    return [];
  }
};

// Get accommodation details
export const getAccommodationDetails = async (id: string): Promise<Accommodation | null> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error loading accommodation details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in getAccommodationDetails:', error);
    return null;
  }
};

// Search accommodations
export const searchAccommodations = async (query: string): Promise<Accommodation[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(20);

    if (error) {
      console.error('❌ Error searching accommodations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in searchAccommodations:', error);
    return [];
  }
};

// Minimal marker data for map rendering (performance optimization)
export interface AccommodationMarker {
  id: string;
  name: string;
  coords: [number, number];
  accommodation_type: Accommodation['accommodation_type'];
  county: string;
  region: string;
  has_fishing_pond: boolean;
}

// Load minimal marker data
export const loadAccommodationMarkers = async (): Promise<AccommodationMarker[]> => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('id, name, accommodation_type, county, region, latitude, longitude, has_fishing_pond')
      .order('name');

    if (error) {
      console.error('❌ Error loading accommodation markers:', error);
      return [];
    }

    if (!data) return [];

    return data.map(accommodation => {
      const lat = accommodation.latitude;
      const lng = accommodation.longitude;

      // Validate coordinates
      if (!lat || !lng || lat < 43 || lat > 48 || lng < 20 || lng > 30) {
        console.warn(`Invalid coords for ${accommodation.name}: (${lat}, ${lng}), using default`);
        return {
          id: accommodation.id,
          name: accommodation.name,
          coords: [25.0, 45.0] as [number, number],
          accommodation_type: accommodation.accommodation_type,
          county: accommodation.county,
          region: accommodation.region,
          has_fishing_pond: accommodation.has_fishing_pond
        };
      }

      return {
        id: accommodation.id,
        name: accommodation.name,
        coords: [lng, lat] as [number, number], // MapLibre uses [lng, lat]
        accommodation_type: accommodation.accommodation_type,
        county: accommodation.county,
        region: accommodation.region,
        has_fishing_pond: accommodation.has_fishing_pond
      };
    });
  } catch (error) {
    console.error('❌ Error in loadAccommodationMarkers:', error);
    return [];
  }
};

