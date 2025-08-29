/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_MAP_TILES_URL: string;
  readonly VITE_MAP_ATTRIBUTION: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUBSCRIPTION_ENABLED: string;
  readonly VITE_PREMIUM_FEATURES_ENABLED: string;
}

/* eslint-disable no-unused-vars */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
