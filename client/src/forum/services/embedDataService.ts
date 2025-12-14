/**
 * Embed Data Service
 * Fetches data for embedded records, catches, and gear from Supabase
 */

import { supabase } from '@/lib/supabase';
import { getR2ImageUrlProxy } from '@/lib/supabase';

export interface RecordEmbedData {
  id: string;
  species_name: string;
  scientific_name?: string;
  weight: number;
  length?: number;
  location_name?: string;
  date_caught?: string;
  image_url?: string;
  video_url?: string;
  user_display_name?: string;
  user_username?: string;
  user_photo_url?: string;
  global_id?: number;
}

export interface CatchEmbedData {
  id: string;
  species_name?: string;
  scientific_name?: string;
  weight?: number;
  length_cm?: number;
  location_name?: string;
  captured_at?: string;
  photo_url?: string;
  video_url?: string;
  user_display_name?: string;
  user_username?: string;
  user_photo_url?: string;
  global_id?: number;
}

export interface GearEmbedData {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  price?: number;
  purchase_date?: string;
  image_url?: string;
  description?: string;
  category?: string;
}

/**
 * Fetch record data by ID (supports both UUID and global_id)
 */
export async function fetchRecordEmbedData(recordId: string): Promise<RecordEmbedData | null> {
  try {
    // Try to parse as UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId);
    
    let query = supabase
      .from('records')
      .select(`
        id,
        weight,
        length,
        date_caught,
        image_url,
        video_url,
        global_id,
        fish_species:species_id(name, scientific_name),
        fishing_locations:location_id(name, type, county),
        profiles!records_user_id_fkey(id, display_name, username, photo_url)
      `)
      .eq('status', 'verified')
      .limit(1);

    if (isUUID) {
      query = query.eq('id', recordId);
    } else {
      // Try as global_id (number)
      const globalId = parseInt(recordId, 10);
      if (!isNaN(globalId)) {
        query = query.eq('global_id', globalId);
      } else {
        return null;
      }
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching record embed:', error);
      console.error('Query details:', { recordId, isUUID, globalId: isUUID ? null : parseInt(recordId, 10) });
      return null;
    }

    if (!data) {
      console.warn('No record found for:', recordId);
      return null;
    }

    // Supabase returns objects for one-to-one relationships, not arrays
    const fishSpecies = Array.isArray(data.fish_species) ? data.fish_species[0] : data.fish_species;
    const fishingLocation = Array.isArray(data.fishing_locations) ? data.fishing_locations[0] : data.fishing_locations;
    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

    return {
      id: data.id,
      species_name: (fishSpecies as any)?.name || 'Necunoscut',
      scientific_name: (fishSpecies as any)?.scientific_name,
      weight: data.weight,
      length: data.length,
      location_name: (fishingLocation as any)?.name,
      date_caught: data.date_caught,
      image_url: data.image_url ? getR2ImageUrlProxy(data.image_url) : undefined,
      video_url: data.video_url ? getR2ImageUrlProxy(data.video_url) : undefined,
      user_display_name: (profile as any)?.display_name,
      user_username: (profile as any)?.username,
      user_photo_url: (profile as any)?.photo_url ? getR2ImageUrlProxy((profile as any).photo_url) : undefined,
      global_id: data.global_id || undefined
    };
  } catch (error) {
    console.error('Error in fetchRecordEmbedData:', error);
    return null;
  }
}

/**
 * Fetch catch data by ID (supports both UUID and global_id)
 */
export async function fetchCatchEmbedData(catchId: string): Promise<CatchEmbedData | null> {
  try {
    // Try to parse as UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(catchId);
    
    let query = supabase
      .from('catches')
      .select(`
        id,
        weight,
        length_cm,
        captured_at,
        photo_url,
        video_url,
        global_id,
        fish_species:species_id(name, scientific_name),
        fishing_locations:location_id(name, type, county),
        profiles!catches_user_id_fkey(id, display_name, username, photo_url)
      `)
      .limit(1);

    if (isUUID) {
      query = query.eq('id', catchId);
    } else {
      // Try as global_id (number)
      const globalId = parseInt(catchId, 10);
      if (!isNaN(globalId)) {
        query = query.eq('global_id', globalId);
      } else {
        return null;
      }
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching catch embed:', error);
      console.error('Query details:', { catchId, isUUID, globalId: isUUID ? null : parseInt(catchId, 10) });
      return null;
    }

    if (!data) {
      console.warn('No catch found for:', catchId);
      return null;
    }

    // Supabase returns objects for one-to-one relationships, not arrays
    const fishSpecies = Array.isArray(data.fish_species) ? data.fish_species[0] : data.fish_species;
    const fishingLocation = Array.isArray(data.fishing_locations) ? data.fishing_locations[0] : data.fishing_locations;
    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

    return {
      id: data.id,
      species_name: (fishSpecies as any)?.name,
      scientific_name: (fishSpecies as any)?.scientific_name,
      weight: data.weight,
      length_cm: data.length_cm,
      location_name: (fishingLocation as any)?.name,
      captured_at: data.captured_at,
      photo_url: data.photo_url ? getR2ImageUrlProxy(data.photo_url) : undefined,
      video_url: data.video_url ? getR2ImageUrlProxy(data.video_url) : undefined,
      user_display_name: (profile as any)?.display_name,
      user_username: (profile as any)?.username,
      user_photo_url: (profile as any)?.photo_url ? getR2ImageUrlProxy((profile as any).photo_url) : undefined,
      global_id: data.global_id || undefined
    };
  } catch (error) {
    console.error('Error in fetchCatchEmbedData:', error);
    return null;
  }
}

/**
 * Fetch gear data by ID (supports both UUID and global_id)
 */
export async function fetchGearEmbedData(gearId: string): Promise<GearEmbedData | null> {
  try {
    // Try to parse as UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gearId);
    
    let query = supabase
      .from('user_gear')
      .select(`
        id,
        name,
        brand,
        model,
        purchase_price,
        purchase_date,
        image_url,
        description,
        gear_type,
        global_id
      `)
      .eq('is_public', true)
      .limit(1);

    if (isUUID) {
      query = query.eq('id', gearId);
    } else {
      // Try as global_id (number)
      const globalId = parseInt(gearId, 10);
      if (!isNaN(globalId)) {
        query = query.eq('global_id', globalId);
      } else {
        return null;
      }
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching gear embed:', error);
      console.error('Query details:', { gearId, isUUID, globalId: isUUID ? null : parseInt(gearId, 10) });
      return null;
    }

    if (!data) {
      console.warn('No gear found for:', gearId);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      brand: data.brand,
      model: data.model,
      price: data.price,
      purchase_date: data.purchase_date,
      image_url: data.image_url ? getR2ImageUrlProxy(data.image_url) : undefined,
      description: data.description,
      category: data.category
    };
  } catch (error) {
    console.error('Error in fetchGearEmbedData:', error);
    return null;
  }
}

