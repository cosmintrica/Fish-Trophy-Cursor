/**
 * Map Markers Hook
 * Manages map markers data using React Query
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-client'
import { loadFishingMarkers, loadFishingLocations, FishingMarker, FishingLocation } from '@/services/fishingLocations'
import { loadAJVPSOfficeMarkers, AJVPSOfficeMarker } from '@/services/ajvpsOffices'
import { loadAccommodationMarkers, AccommodationMarker } from '@/services/accommodations'

export function useFishingMarkers() {
  const { data: markers = [], isLoading, error, refetch } = useQuery<FishingMarker[]>({
    queryKey: queryKeys.fishingMarkers(),
    queryFn: async () => {
      return await loadFishingMarkers()
    },
    staleTime: 5 * 60 * 1000, // 5 minute - markeri se schimbă rar
    gcTime: 15 * 60 * 1000, // 15 minute - cache persistent
    refetchOnWindowFocus: false,
  })

  return {
    markers,
    loading: isLoading && !markers.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

export function useFishingLocations() {
  const { data: locations = [], isLoading, error, refetch } = useQuery<FishingLocation[]>({
    queryKey: queryKeys.fishingLocations(),
    queryFn: async () => {
      return await loadFishingLocations()
    },
    staleTime: 5 * 60 * 1000, // 5 minute
    gcTime: 15 * 60 * 1000, // 15 minute
    refetchOnWindowFocus: false,
  })

  return {
    locations,
    loading: isLoading && !locations.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

export function useShopMarkers() {
  const { data: markers = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.shopMarkers(),
    queryFn: async () => {
      const { data } = await supabase
        .from('fishing_shops')
        .select('id, name, county, region, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      
      return (data || []).map(shop => ({
        id: shop.id,
        name: shop.name,
        coords: [shop.longitude, shop.latitude] as [number, number],
        county: shop.county,
        region: shop.region
      })).filter(m => m.coords[0] >= 20 && m.coords[0] <= 30 && m.coords[1] >= 43 && m.coords[1] <= 48)
    },
    staleTime: 5 * 60 * 1000, // 5 minute
    gcTime: 15 * 60 * 1000, // 15 minute
    refetchOnWindowFocus: false,
  })

  return {
    markers,
    loading: isLoading && !markers.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

export function useAJVPSMarkers() {
  const { data: markers = [], isLoading, error, refetch } = useQuery<AJVPSOfficeMarker[]>({
    queryKey: queryKeys.ajvpsMarkers(),
    queryFn: async () => {
      return await loadAJVPSOfficeMarkers()
    },
    staleTime: 5 * 60 * 1000, // 5 minute
    gcTime: 15 * 60 * 1000, // 15 minute
    refetchOnWindowFocus: false,
  })

  return {
    markers,
    loading: isLoading && !markers.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

export function useAccommodationMarkers() {
  const { data: markers = [], isLoading, error, refetch } = useQuery<AccommodationMarker[]>({
    queryKey: queryKeys.accommodationMarkers(),
    queryFn: async () => {
      return await loadAccommodationMarkers()
    },
    staleTime: 5 * 60 * 1000, // 5 minute
    gcTime: 15 * 60 * 1000, // 15 minute
    refetchOnWindowFocus: false,
  })

  return {
    markers,
    loading: isLoading && !markers.length,
    error: error as Error | null,
    refetch: () => refetch()
  }
}

