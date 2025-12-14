/**
 * Records Page Hook
 * Manages records page data using React Query
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-client'

export function useAllRecords() {
  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.allRecords(),
    queryFn: async () => {
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name, scientific_name),
          fishing_locations:location_id(name, type, county),
          profiles!records_user_id_fkey(id, display_name, username, email, photo_url)
        `)
        .eq('status', 'verified')
        .order('weight', { ascending: false })

      if (recordsError) {
        throw new Error(recordsError.message)
      }

      // If fishing_locations is missing, try to load them manually
      const recordsWithLocations = await Promise.all(
        (recordsData || []).map(async (record: any) => {
          // If location data is missing but location_id exists, fetch it
          if (!record.fishing_locations && record.location_id) {
            try {
              const { data: locationData } = await supabase
                .from('fishing_locations')
                .select('id, name, type, county')
                .eq('id', record.location_id)
                .single();
              
              if (locationData) {
                record.fishing_locations = locationData;
              }
            } catch (err) {
              console.warn('Failed to load location for record:', record.id, err);
            }
          }
          return record;
        })
      );

      return recordsWithLocations
    },
    staleTime: 1 * 60 * 1000, // 1 minut - records se schimbă mai des
    gcTime: 3 * 60 * 1000, // 3 minute
    refetchOnWindowFocus: false,
  })

  return {
    records,
    loading: isLoading && !records.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

export function useSpecies() {
  const { data: species = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.species(),
    queryFn: async () => {
      const { data, error: speciesError } = await supabase
        .from('fish_species')
        .select('id, name')
        .order('name')

      if (speciesError) {
        throw new Error(speciesError.message)
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minute - species se schimbă foarte rar
    gcTime: 30 * 60 * 1000, // 30 minute - cache foarte persistent
    refetchOnWindowFocus: false,
  })

  return {
    species,
    loading: isLoading && !species.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

export function useLocations() {
  const { data: locations = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.locations(),
    queryFn: async () => {
      const { data, error: locationsError } = await supabase
        .from('fishing_locations')
        .select('id, name, type, county')
        .order('name')

      if (locationsError) {
        throw new Error(locationsError.message)
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minute - locations se schimbă foarte rar
    gcTime: 30 * 60 * 1000, // 30 minute - cache foarte persistent
    refetchOnWindowFocus: false,
  })

  return {
    locations,
    loading: isLoading && !locations.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

