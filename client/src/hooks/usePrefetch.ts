/**
 * Hook pentru prefetch pe hover
 * Preîncarcă datele când utilizatorul trece cu mouse-ul peste link-uri
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import { supabase } from '../lib/supabase';

/**
 * Hook pentru prefetch pagini și date
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch un profil public când utilizatorul trece cu mouse-ul peste link
   */
  const prefetchProfile = async (username: string) => {
    // Query key pentru profile by username (diferit de profile by userId)
    const queryKey = ['profile-by-username', username.toLowerCase()] as const;
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return; // Datele sunt deja în cache, nu mai e nevoie de prefetch
    }

    // Prefetch profilul
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        // Fetch profile by username (similar cu PublicProfile)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username || '');
        
        let query = supabase
          .from('profiles')
          .select('id, username, display_name, photo_url, cover_photo_url, bio, location, created_at');

        if (isUUID) {
          query = query.eq('id', username);
        } else {
          query = query.eq('username', username.toLowerCase());
        }

        const { data: profile, error } = await query.single();

        if (error) {
          throw new Error(error.message);
        }

        return profile;
      },
      staleTime: 2 * 60 * 1000, // 2 minute
    });
  };

  /**
   * Prefetch records page data
   */
  const prefetchRecords = async () => {
    const queryKey = queryKeys.allRecords();
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return;
    }

    // Prefetch records
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('records')
          .select('*, fish_species:species_id(name), profiles!records_user_id_fkey(username, display_name, photo_url)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          throw new Error(error.message);
        }

        return data;
      },
      staleTime: 2 * 60 * 1000, // 2 minute
    });
  };

  /**
   * Prefetch species page data
   */
  const prefetchSpecies = async () => {
    const queryKey = queryKeys.species();
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return;
    }

    // Prefetch species
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('fish_species')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minute (species nu se schimbă des)
    });
  };

  return {
    prefetchProfile,
    prefetchRecords,
    prefetchSpecies,
  };
}

