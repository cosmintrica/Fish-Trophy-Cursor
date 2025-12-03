/**
 * SWR Configuration
 * Global configuration for SWR data fetching
 */

import { SWRConfiguration } from 'swr'

/**
 * Configurație globală SWR
 * NOTĂ: Nu definim fetcher global - fiecare hook își definește propriul fetcher
 * pentru flexibilitate maximă
 */
export const swrConfig: SWRConfiguration = {
  // Revalidate on focus - actualizează datele când utilizatorul revine la tab
  revalidateOnFocus: true,
  
  // Revalidate on reconnect - actualizează când conexiunea se restabilește
  revalidateOnReconnect: true,
  
  // Dedupe interval - timp minim între revalidări (în ms)
  dedupingInterval: 2000,
  
  // Focus throttle interval - throttle pentru revalidate on focus
  focusThrottleInterval: 5000,
  
  // Error retry count
  errorRetryCount: 3,
  
  // Error retry interval
  errorRetryInterval: 5000,
  
  // Fallback data - poate fi setat per hook
  fallback: {},
  
  // Provider - nu e necesar, folosim default
  // provider: undefined,
}

/**
 * Helper functions pentru generarea SWR keys
 */
export const swrKeys = {
  topics: (subcategoryId: string, page = 1, pageSize = 20) => 
    `swr:topics:${subcategoryId}:${page}:${pageSize}`,
  
  posts: (topicId: string, page = 1, pageSize = 20) => 
    `swr:posts:${topicId}:${page}:${pageSize}`,
  
  categories: () => 'swr:categories',
  
  topic: (topicId: string, subcategorySlug?: string) => 
    subcategorySlug ? `swr:topic:${topicId}:${subcategorySlug}` : `swr:topic:${topicId}`,
}

