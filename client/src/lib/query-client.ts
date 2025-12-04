/**
 * React Query Configuration
 * Global configuration for React Query data fetching
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Configurație globală React Query
 * Optimizată pentru performanță maximă (similar cu SWR)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - cât timp datele sunt considerate "fresh" (similar cu SWR dedupingInterval)
      // Datele sunt returnate instant din cache dacă sunt "fresh"
      staleTime: 5 * 60 * 1000, // 5 minute - datele sunt fresh mai mult timp (cache mai persistent)
      
      // Cache time - cât timp datele rămân în cache după ce nu mai sunt folosite
      gcTime: 10 * 60 * 1000, // 10 minute - mai lung pentru cache persistence între navigări
      
      // Retry logic - doar pentru erori de rețea, nu pentru 404/400
      retry: (failureCount, error: any) => {
        // Nu retry pentru erori 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry maxim 2 ori pentru erori de rețea
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Max 5 secunde
      
      // Refetch on window focus - dezactivat pentru performanță (similar cu SWR revalidateOnFocus: false pentru unele query-uri)
      // Poate fi activat per-query dacă e nevoie
      refetchOnWindowFocus: false, // Dezactivat pentru performanță - datele sunt fresh 2 minute
      
      // Refetch on reconnect - activat pentru a actualiza datele când conexiunea se restabilește
      refetchOnReconnect: true,
      
      // Refetch on mount - doar dacă datele sunt stale (optimizare pentru cache)
      refetchOnMount: false, // Dezactivat - folosim doar cache și manual refetch
      
      // Structural sharing - React Query păstrează referințele obiectelor dacă datele nu s-au schimbat
      // Asta previne re-render-uri inutile
      structuralSharing: true,
    },
    mutations: {
      // Retry logic pentru mutations - doar 1 dată pentru erori de rețea
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false; // Nu retry pentru erori client
        }
        return failureCount < 1; // Retry o singură dată
      },
      retryDelay: 1000,
    },
  },
})

/**
 * Helper functions pentru generarea query keys
 */
export const queryKeys = {
  topics: (subcategoryId: string, page = 1, pageSize = 20) => 
    ['topics', subcategoryId, page, pageSize] as const,
  
  posts: (topicId: string, page = 1, pageSize = 20) => 
    ['posts', topicId, page, pageSize] as const,
  
  categories: () => ['categories'] as const,
  
  topic: (topicId: string, subcategorySlug?: string) => 
    subcategorySlug 
      ? ['topic', topicId, subcategorySlug] as const
      : ['topic', topicId] as const,
  
  // Profile hooks
  records: (userId: string) => ['records', userId] as const,
  gear: (userId: string) => ['gear', userId] as const,
  profile: (userId: string) => ['profile', userId] as const,
  counties: () => ['counties'] as const,
  cities: (countyId: string) => ['cities', countyId] as const,
  
  // Forum hooks
  forumStats: () => ['forumStats'] as const,
  onlineUsers: () => ['onlineUsers'] as const,
  adminDashboardStats: () => ['adminDashboardStats'] as const,
  
  // Records page
  allRecords: () => ['allRecords'] as const,
  species: () => ['species'] as const,
  locations: () => ['locations'] as const,
  
  // Home page
  fishingMarkers: () => ['fishingMarkers'] as const,
  shopMarkers: () => ['shopMarkers'] as const,
  ajvpsMarkers: () => ['ajvpsMarkers'] as const,
  accommodationMarkers: () => ['accommodationMarkers'] as const,
  fishingLocations: () => ['fishingLocations'] as const,
  
  // Forum read status
  topicReadStatus: (topicId: string, userId: string) => 
    ['topic-read-status', topicId, userId] as const,
  subcategoryUnreadStatus: (subcategoryId: string, userId: string) =>
    ['subcategory-read-status', subcategoryId, userId] as const,
  
  // Admin moderation
  adminUserSearch: (query: string) => ['admin-user-search', query] as const,
  adminUserRestrictions: (userId: string) => ['admin-user-restrictions', userId] as const,
  adminUserReputationLogs: (userId: string) => ['admin-user-reputation-logs', userId] as const,
  
  // Forum user profile
  forumUserProfile: (userId: string) => ['forum-user-profile', userId] as const,
}

