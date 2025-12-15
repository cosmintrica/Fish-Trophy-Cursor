import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseClient?: SupabaseClient
}

// Debug in development - REMOVED FOR SECURITY

// Safe creation: if env missing, expose a minimal no-op client to avoid crashes in dev
function createSafeSupabase(): SupabaseClient | Record<string, unknown> {
  const looksLikePlaceholder = (val?: string) => !val || /your-project|your-anon-key|^https?:\/\/your-project\.supabase\.co$/i.test(val) || val === 'https://your-project.supabase.co'

  if (
    supabaseUrl &&
    supabaseAnonKey &&
    !looksLikePlaceholder(supabaseUrl) &&
    !looksLikePlaceholder(supabaseAnonKey)
  ) {
    if (!globalForSupabase.__supabaseClient) {
      globalForSupabase.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
    }
    return globalForSupabase.__supabaseClient
  }
  // Lightweight stub for local development without real credentials
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() { } } } }),
      signInWithPassword: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      signUp: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      signInWithOAuth: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      resend: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      setSession: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      verifyOtp: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
      linkIdentity: async () => ({ data: null, error: new Error('Auth disabled in dev (no credentials)') }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Storage disabled in dev (no credentials)') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    from: () => ({
      select: () => ({
        order: () => ({
          data: [],
          error: new Error('DB disabled in dev (no credentials)')
        }),
        data: [],
        error: new Error('DB disabled in dev (no credentials)')
      }),
      insert: async () => ({ data: null, error: new Error('DB disabled in dev (no credentials)') }),
      update: async () => ({ data: null, error: new Error('DB disabled in dev (no credentials)') }),
      delete: async () => ({ data: null, error: new Error('DB disabled in dev (no credentials)') })
    })
  }
}

export const supabase = createSafeSupabase() as unknown as SupabaseClient

// Storage bucket names (Supabase - only avatars and thumbnails)
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  THUMBNAILS: 'thumbnails'
} as const

// Cloudflare R2 configuration (env-only)
// Cloudflare R2 configuration (env-only)
export const R2_CONFIG = {
  BUCKET_NAME: import.meta.env.VITE_R2_BUCKET_NAME || import.meta.env.R2_BUCKET_NAME || '',
  ACCOUNT_ID: import.meta.env.VITE_R2_ACCOUNT_ID || import.meta.env.R2_ACCOUNT_ID || '',
  ACCESS_KEY_ID: import.meta.env.VITE_R2_ACCESS_KEY_ID || import.meta.env.R2_ACCESS_KEY_ID || '',
  SECRET_ACCESS_KEY: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || import.meta.env.R2_SECRET_ACCESS_KEY || '',
  S3_ENDPOINT: import.meta.env.VITE_R2_S3_ENDPOINT || import.meta.env.R2_S3_ENDPOINT || '',
  PUBLIC_URL: import.meta.env.VITE_R2_PUBLIC_URL || import.meta.env.R2_PUBLIC_URL || ''
} as const

// R2 content categories
export const R2_CONTENT = {
  SUBMISSION_IMAGES: 'submission-images',
  SUBMISSION_VIDEOS: 'submission-videos',
  FISH_SPECIES: 'fish-species',
  LOCATIONS: 'locations',
  SHOPS: 'shops',
  PARKING: 'parking',
  EDUCATIONAL: 'educational'
} as const

// Storage helper functions
export const uploadAvatar = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .getPublicUrl(fileName)

  return publicUrl
}

// R2 upload functions (for heavy content)
export const uploadToR2 = async (file: File, category: string, fileName: string): Promise<string> => {
  // This will be implemented with AWS SDK for R2
  // For now, return a placeholder URL
  const fileExt = file.name.split('.').pop()
  const fullFileName = `${category}/${fileName}.${fileExt}`
  return `${R2_CONFIG.PUBLIC_URL}/${fullFileName}`
}

export const uploadSubmissionImage = async (file: File, userId: string, recordId: string) => {
  const fileName = `${userId}/${recordId}`
  return uploadToR2(file, R2_CONTENT.SUBMISSION_IMAGES, fileName)
}

export const uploadSubmissionVideo = async (file: File, userId: string, recordId: string) => {
  const fileName = `${userId}/${recordId}`
  return uploadToR2(file, R2_CONTENT.SUBMISSION_VIDEOS, fileName)
}

// Helper function to determine if file is video
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/')
}

// Smart upload function that chooses the right bucket
export const uploadSubmission = async (file: File, userId: string, recordId: string) => {
  if (isVideoFile(file)) {
    return uploadSubmissionVideo(file, userId, recordId)
  } else {
    return uploadSubmissionImage(file, userId, recordId)
  }
}

export const uploadThumbnail = async (file: File, recordId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${recordId}.${fileExt}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.THUMBNAILS)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKETS.THUMBNAILS)
    .getPublicUrl(fileName)

  return publicUrl
}

// Helper functions for R2 content
export const getR2ImageUrl = (category: string, filename: string): string => {
  return `${R2_CONFIG.PUBLIC_URL}/${category}/${filename}`
}

// Helper function to get Netlify Functions base URL
// Works correctly on mobile when accessing via network IP (e.g., 192.168.1.100:5173)
export const getNetlifyFunctionsBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    // In development, use window.location.hostname to work on mobile
    // This allows accessing Netlify Functions on port 8889 from any device on the network
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:8889`;
  }
  // In production, use relative path
  return '';
};

// Get R2 image URL through proxy to avoid CORS issues
export const getR2ImageUrlProxy = (imageUrl: string): string => {
  if (!imageUrl) return imageUrl;

  // If it's already a proxy URL or not an R2 URL, return as is
  if (imageUrl.includes('/.netlify/functions/r2-proxy') || !imageUrl.includes('r2.cloudflarestorage.com')) {
    return imageUrl;
  }

  // In production, always use proxy (relative path)
  if (import.meta.env.PROD) {
    return `/.netlify/functions/r2-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // In development:
  // 1. Try to use Netlify Dev proxy if available (port 8889)
  // 2. Fallback to direct R2 URL (R2 allows CORS for public buckets, so this should work)
  // R2 public buckets allow CORS, so direct URLs work in development
  // The proxy is mainly needed for production to ensure consistent behavior
  const baseUrl = getNetlifyFunctionsBaseUrl();

  // Check if it's a video file or YouTube URL
  // If so, BYPASS PROXY to avoid 6MB limit (videos) and 502 errors
  const isVideo = /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(imageUrl);
  const isYouTube = imageUrl.includes('youtube.com') || imageUrl.includes('youtu.be');

  if (isVideo || isYouTube || import.meta.env.DEV) {
    // If we have a public URL configured, rewrite any private keys to use it
    if (R2_CONFIG.PUBLIC_URL && imageUrl.includes('r2.cloudflarestorage.com')) {
      // Extract the path after the domain
      // Extract the path after the domain
      // const path = imageUrl.split('r2.cloudflarestorage.com')[1];
      // Some paths might include the bucket name if not careful, but usually it's /bucket/key or /key
      // Our PUBLIC_URL should ideally be the base.
      // Let's safe-guard: if PUBLIC_URL is r2.dev, we just want to replace the domain part.

      // Strategy: Remove the known private domain and prepend the public one.
      // Private: https://uid.r2.cloudflarestorage.com/bucket/path/to/file
      // Public: https://pub-uid.r2.dev/path/to/file  (Note: public usually doesn't need bucket name if mapped to custom domain, but r2.dev might need careful handling depending on user setup)

      // Simpler approach: If the PUBLIC_URL is set, use it as the base for the file structure.
      // However, we need to know the 'key'.
      // Assumption: The stored URL structure is .../bucketName/path... or .../path...

      // Let's try to just replace the domain root if it matches the private pattern
      return imageUrl.replace(/https:\/\/.*\.r2\.cloudflarestorage\.com(\/[^/]+)?/, R2_CONFIG.PUBLIC_URL);
    }
    return imageUrl;
  }

  // If Netlify Dev is running (baseUrl is set), use proxy
  if (baseUrl) {
    return `${baseUrl}/.netlify/functions/r2-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // Fallback: Use direct R2 URL (works because R2 public buckets allow CORS)
  // This ensures images work even if Netlify Dev is not running
  return imageUrl;
}

export const getFishSpeciesImage = (speciesName: string, imageType: 'main' | 'detail' | 'habitat' = 'main'): string => {
  const filename = `${speciesName.toLowerCase().replace(/\s+/g, '-')}-${imageType}.jpg`
  return getR2ImageUrl(R2_CONTENT.FISH_SPECIES, filename)
}

export const getLocationImage = (locationId: string, imageType: 'main' | 'aerial' | 'fishing-spot' = 'main'): string => {
  const filename = `${locationId}-${imageType}.jpg`
  return getR2ImageUrl(R2_CONTENT.LOCATIONS, filename)
}

export const getShopImage = (shopId: string, imageType: 'logo' | 'exterior' | 'interior' = 'logo'): string => {
  const filename = `${shopId}-${imageType}.jpg`
  return getR2ImageUrl(R2_CONTENT.SHOPS, filename)
}

export const getParkingImage = (locationId: string): string => {
  const filename = `${locationId}-parking.jpg`
  return getR2ImageUrl(R2_CONTENT.PARKING, filename)
}

// Database types
export interface User {
  id: string
  email: string
  display_name?: string
  photo_url?: string
  phone?: string
  bio?: string
  location?: string
  website?: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface Profile {
  displayName: string
  email: string
  username?: string
  phone?: string
  location?: string
  bio?: string
  county_id?: string
  city_id?: string
  website?: string
  youtube_channel?: string
  show_gear_publicly?: boolean
  show_county_publicly?: boolean
  show_city_publicly?: boolean
  show_website_publicly?: boolean
  show_youtube_publicly?: boolean
  username_last_changed_at?: string
  photo_url?: string
  cover_photo_url?: string
}
