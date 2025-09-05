import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor libraries for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') && !id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('maplibre-gl') || id.includes('mapbox-gl')) {
              return 'mapbox-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Group other small libraries together
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 2000,
    minify: false,
  },
  publicDir: 'public',
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'maplibre-gl',
      '@supabase/supabase-js',
    ],
    exclude: ['web-vitals'],
  },
});
