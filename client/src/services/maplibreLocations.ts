// services/maplibreLocations.ts
import { supabase } from '@/lib/supabase';

export interface MapLibreLocation {
  id: string;
  name: string;
  type: 'lac' | 'rau' | 'balti_private' | 'balti_salbatic' | 'mare' | 'delta';
  county: string;
  region: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
  administrare?: string;
  description?: string;
  image_url?: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    id: string;
    name: string;
    type: string;
    county: string;
    region: string;
    subtitle?: string;
    administrare?: string;
    description?: string;
    image_url?: string;
  };
}

export interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Funcția principală pentru a obține toate locațiile ca GeoJSON
export async function getAllLocationsAsGeoJSON(): Promise<GeoJSONResponse> {
  try {
    const { data, error } = await supabase
      .from('fishing_locations')
      .select('id, name, type, county, region, latitude, longitude, subtitle, administrare, description, image_url')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(10000);

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    const features: GeoJSONFeature[] = (data || [])
      .filter((location) => 
        Number.isFinite(location.latitude) && 
        Number.isFinite(location.longitude)
      )
      .map((location) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude] as [number, number]
        },
        properties: {
          id: location.id,
          name: location.name || 'Fără nume',
          type: location.type || 'unknown',
          county: location.county || '',
          region: location.region || '',
          subtitle: location.subtitle,
          administrare: location.administrare,
          description: location.description,
          image_url: location.image_url
        }
      }));

    return {
      type: 'FeatureCollection',
      features
    };
  } catch (error) {
    console.error('Error in getAllLocationsAsGeoJSON:', error);
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
}

// Funcția pentru a obține locațiile din viewport (bbox)
export async function getLocationsInBbox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  typeFilter?: string[]
): Promise<GeoJSONResponse> {
  try {
    let query = supabase
      .from('fishing_locations')
      .select('id, name, type, county, region, latitude, longitude, subtitle, administrare, description, image_url')
      .gte('longitude', minLng)
      .lte('longitude', maxLng)
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(8000);

    if (typeFilter && typeFilter.length > 0) {
      query = query.in('type', typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bbox locations:', error);
      throw error;
    }

    const features: GeoJSONFeature[] = (data || [])
      .filter((location) => 
        Number.isFinite(location.latitude) && 
        Number.isFinite(location.longitude)
      )
      .map((location) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude] as [number, number]
        },
        properties: {
          id: location.id,
          name: location.name || 'Fără nume',
          type: location.type || 'unknown',
          county: location.county || '',
          region: location.region || '',
          subtitle: location.subtitle,
          administrare: location.administrare,
          description: location.description,
          image_url: location.image_url
        }
      }));

    return {
      type: 'FeatureCollection',
      features
    };
  } catch (error) {
    console.error('Error in getLocationsInBbox:', error);
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
}
