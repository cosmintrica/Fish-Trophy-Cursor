import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage bucket names (Supabase - only avatars and thumbnails)
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  THUMBNAILS: 'thumbnails'
} as const

// Cloudflare R2 configuration for all heavy content
export const R2_CONFIG = {
  BUCKET_NAME: 'fishtrophy-content',
  ACCOUNT_ID: import.meta.env.VITE_R2_ACCOUNT_ID || '',
  ACCESS_KEY_ID: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
  SECRET_ACCESS_KEY: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
  S3_ENDPOINT: 'https://5aec1dfc4ea8ddfa00e59861f94b7ffd.r2.cloudflarestorage.com',
  PUBLIC_URL: 'https://5aec1dfc4ea8ddfa00e59861f94b7ffd.r2.cloudflarestorage.com/fishtrophy-content'
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
  phone?: string
  location?: string
  bio?: string
}
