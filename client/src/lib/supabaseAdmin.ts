// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'fishing-records/1.0' } },
  }
);

// ușor util: citirea numelor de tabel/coloane din env (dacă diferă)
export const DB = {
  schema: process.env.VITE_SUPABASE_SCHEMA ?? 'public',
  table: process.env.VITE_SUPABASE_TABLE ?? 'fishing_locations',
};
