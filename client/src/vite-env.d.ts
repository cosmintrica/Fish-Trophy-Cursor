/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  readonly VITE_MAP_TILES_URL: string;
  readonly VITE_MAP_ATTRIBUTION: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUBSCRIPTION_ENABLED: string;
  readonly VITE_PREMIUM_FEATURES_ENABLED: string;
}

// ImportMeta is already defined by Vite, but we extend it
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
