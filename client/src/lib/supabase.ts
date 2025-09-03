import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cckytfxrigzkpfkrrqbv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
