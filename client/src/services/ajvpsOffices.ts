import { supabase } from '@/lib/supabase';

export interface AJVPSOffice {
  id: string;
  name: string;
  office_type: 'ajvps' | 'primarie' | 'agentie' | 'institutie';
  address: string;
  city: string;
  county: string;
  region: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  opening_hours?: string;
  services?: string[];
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Convert office type to display name
export const getOfficeTypeName = (type: AJVPSOffice['office_type']): string => {
  const names: Record<AJVPSOffice['office_type'], string> = {
    'ajvps': 'Birou AJVPS',
    'primarie': 'Primărie',
    'agentie': 'Agenție',
    'institutie': 'Instituție'
  };
  return names[type] || type;
};

// Get office icon
export const getOfficeIcon = (type: AJVPSOffice['office_type']): string => {
  const icons: Record<AJVPSOffice['office_type'], string> = {
    'ajvps': '🏛️',
    'primarie': '🏢',
    'agentie': '📋',
    'institutie': '🏛️'
  };
  return icons[type] || '🏛️';
};

// Load all AJVPS offices
export const loadAJVPSOffices = async (): Promise<AJVPSOffice[]> => {
  try {
    const { data, error } = await supabase
      .from('ajvps_offices')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error loading AJVPS offices:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAJVPSOffices:', error);
    return [];
  }
};

// Load offices by type
export const loadAJVPSOfficesByType = async (type: AJVPSOffice['office_type']): Promise<AJVPSOffice[]> => {
  try {
    const { data, error } = await supabase
      .from('ajvps_offices')
      .select('*')
      .eq('office_type', type)
      .order('name');

    if (error) {
      console.error('❌ Error loading AJVPS offices by type:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAJVPSOfficesByType:', error);
    return [];
  }
};

// Load offices by region
export const loadAJVPSOfficesByRegion = async (region: string): Promise<AJVPSOffice[]> => {
  try {
    const { data, error } = await supabase
      .from('ajvps_offices')
      .select('*')
      .eq('region', region)
      .order('name');

    if (error) {
      console.error('❌ Error loading AJVPS offices by region:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in loadAJVPSOfficesByRegion:', error);
    return [];
  }
};

// Get office details
export const getAJVPSOfficeDetails = async (id: string): Promise<AJVPSOffice | null> => {
  try {
    const { data, error } = await supabase
      .from('ajvps_offices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error loading AJVPS office details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in getAJVPSOfficeDetails:', error);
    return null;
  }
};

// Search offices
export const searchAJVPSOffices = async (query: string): Promise<AJVPSOffice[]> => {
  try {
    const { data, error } = await supabase
      .from('ajvps_offices')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(20);

    if (error) {
      console.error('❌ Error searching AJVPS offices:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in searchAJVPSOffices:', error);
    return [];
  }
};

// Minimal marker data for map rendering (performance optimization)
export interface AJVPSOfficeMarker {
  id: string;
  name: string;
  coords: [number, number];
  office_type: AJVPSOffice['office_type'];
  county: string;
  region: string;
}

// Load minimal marker data
export const loadAJVPSOfficeMarkers = async (): Promise<AJVPSOfficeMarker[]> => {
  try {
    const { data, error } = await supabase
      .from('ajvps_offices')
      .select('id, name, office_type, county, region, latitude, longitude')
      .order('name');

    if (error) {
      console.error('❌ Error loading AJVPS office markers:', error);
      return [];
    }

    if (!data) return [];

    return data.map(office => {
      const lat = office.latitude;
      const lng = office.longitude;

      // Validate coordinates
      if (!lat || !lng || lat < 43 || lat > 48 || lng < 20 || lng > 30) {
        console.warn(`Invalid coords for ${office.name}: (${lat}, ${lng}), using default`);
        return {
          id: office.id,
          name: office.name,
          coords: [25.0, 45.0] as [number, number],
          office_type: office.office_type,
          county: office.county,
          region: office.region
        };
      }

      return {
        id: office.id,
        name: office.name,
        coords: [lng, lat] as [number, number], // MapLibre uses [lng, lat]
        office_type: office.office_type,
        county: office.county,
        region: office.region
      };
    });
  } catch (error) {
    console.error('❌ Error in loadAJVPSOfficeMarkers:', error);
    return [];
  }
};

