import { FishingMarker, loadFishingMarkers } from './fishingLocations';
import { AJVPSOfficeMarker, loadAJVPSOfficeMarkers } from './ajvpsOffices';
import { AccommodationMarker, loadAccommodationMarkers } from './accommodations';
import { supabase } from '@/lib/supabase';

export type MapLocationType = 
  | 'fishing_location' 
  | 'shop' 
  | 'ajvps_office' 
  | 'accommodation';

export interface UnifiedMapLocation {
  id: string;
  type: MapLocationType;
  name: string;
  coords: [number, number];
  category: string; // 'lac', 'rau', 'pensiune', 'ajvps', etc.
  county: string;
  region: string;
}

// Marker colors for different types
export const markerColors: Record<string, string> = {
  // Fishing locations
  'fishing_location:river': '#10b981',      // verde
  'fishing_location:fluviu': '#10b981',
  'fishing_location:lake': '#3b82f6',       // albastru
  'fishing_location:pond': '#ef4444',       // roșu
  'fishing_location:private_pond': '#f59e0b', // portocaliu
  'fishing_location:balti_salbatic': '#84cc16', // verde deschis
  'fishing_location:maritime': '#06b6d4',   // cyan
  // Shops
  'shop': '#8b5cf6',                        // violet
  // AJVPS Offices
  'ajvps_office': '#ec4899',               // roz
  // Accommodations
  'accommodation': '#f97316'               // portocaliu
};

// Get marker color for a location
export const getMarkerColor = (type: MapLocationType, category?: string): string => {
  const key = category ? `${type}:${category}` : type;
  return markerColors[key] || markerColors[type] || '#6b7280'; // default gray
};

// Load all map locations (unified)
export const loadAllMapLocations = async (): Promise<UnifiedMapLocation[]> => {
  try {
    const [fishingMarkers, shopMarkers, ajvpsMarkers, accommodationMarkers] = await Promise.all([
      loadFishingMarkers(),
      loadShopMarkers(),
      loadAJVPSOfficeMarkers(),
      loadAccommodationMarkers()
    ]);

    const unified: UnifiedMapLocation[] = [
      ...fishingMarkers.map(m => ({
        id: m.id,
        type: 'fishing_location' as MapLocationType,
        name: m.name,
        coords: m.coords,
        category: m.type,
        county: m.county,
        region: m.region
      })),
      ...shopMarkers.map(m => ({
        id: m.id,
        type: 'shop' as MapLocationType,
        name: m.name,
        coords: m.coords,
        category: 'shop',
        county: m.county,
        region: m.region
      })),
      ...ajvpsMarkers.map(m => ({
        id: m.id,
        type: 'ajvps_office' as MapLocationType,
        name: m.name,
        coords: m.coords,
        category: m.office_type,
        county: m.county,
        region: m.region
      })),
      ...accommodationMarkers.map(m => ({
        id: m.id,
        type: 'accommodation' as MapLocationType,
        name: m.name,
        coords: m.coords,
        category: m.accommodation_type,
        county: m.county,
        region: m.region
      }))
    ];

    return unified;
  } catch (error) {
    console.error('❌ Error loading all map locations:', error);
    return [];
  }
};

// Load locations by type
export const loadMapLocationsByType = async (type: MapLocationType): Promise<UnifiedMapLocation[]> => {
  try {
    switch (type) {
      case 'fishing_location': {
        const markers = await loadFishingMarkers();
        return markers.map(m => ({
          id: m.id,
          type: 'fishing_location' as MapLocationType,
          name: m.name,
          coords: m.coords,
          category: m.type,
          county: m.county,
          region: m.region
        }));
      }
      case 'shop': {
        const markers = await loadShopMarkers();
        return markers.map(m => ({
          id: m.id,
          type: 'shop' as MapLocationType,
          name: m.name,
          coords: m.coords,
          category: 'shop',
          county: m.county,
          region: m.region
        }));
      }
      case 'ajvps_office': {
        const markers = await loadAJVPSOfficeMarkers();
        return markers.map(m => ({
          id: m.id,
          type: 'ajvps_office' as MapLocationType,
          name: m.name,
          coords: m.coords,
          category: m.office_type,
          county: m.county,
          region: m.region
        }));
      }
      case 'accommodation': {
        const markers = await loadAccommodationMarkers();
        return markers.map(m => ({
          id: m.id,
          type: 'accommodation' as MapLocationType,
          name: m.name,
          coords: m.coords,
          category: m.accommodation_type,
          county: m.county,
          region: m.region
        }));
      }
      default:
        return [];
    }
  } catch (error) {
    console.error('❌ Error loading map locations by type:', error);
    return [];
  }
};

// Shop marker interface (minimal)
interface ShopMarker {
  id: string;
  name: string;
  coords: [number, number];
  county: string;
  region: string;
}

// Load shop markers (minimal data for map)
export const loadShopMarkers = async (): Promise<ShopMarker[]> => {
  try {
    const { data, error } = await supabase
      .from('fishing_shops')
      .select('id, name, county, region, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('name');

    if (error) {
      console.error('❌ Error loading shop markers:', error);
      return [];
    }

    if (!data) return [];

    return data.map(shop => {
      const lat = shop.latitude;
      const lng = shop.longitude;

      // Validate coordinates
      if (!lat || !lng || lat < 43 || lat > 48 || lng < 20 || lng > 30) {
        console.warn(`Invalid coords for ${shop.name}: (${lat}, ${lng})`);
        return null;
      }

      return {
        id: shop.id,
        name: shop.name,
        coords: [lng, lat] as [number, number], // MapLibre uses [lng, lat]
        county: shop.county,
        region: shop.region
      };
    }).filter((m): m is ShopMarker => m !== null);
  } catch (error) {
    console.error('❌ Error in loadShopMarkers:', error);
    return [];
  }
};

// Get location details by type and id
export const getMapLocationDetails = async (
  id: string, 
  type: MapLocationType
): Promise<any> => {
  try {
    switch (type) {
      case 'fishing_location': {
        const { getLocationDetails } = await import('./fishingLocations');
        return await getLocationDetails(id);
      }
      case 'shop': {
        const { data, error } = await supabase
          .from('fishing_shops')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      }
      case 'ajvps_office': {
        const { getAJVPSOfficeDetails } = await import('./ajvpsOffices');
        return await getAJVPSOfficeDetails(id);
      }
      case 'accommodation': {
        const { getAccommodationDetails } = await import('./accommodations');
        return await getAccommodationDetails(id);
      }
      default:
        return null;
    }
  } catch (error) {
    console.error('❌ Error getting map location details:', error);
    return null;
  }
};

