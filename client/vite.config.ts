import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // Split vendor libraries for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          'ui-vendor': ['lucide-react', 'sonner'],
          'map-vendor': ['leaflet'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'analytics-vendor': ['web-vitals'],
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Ensure public assets are copied
    assetsDir: 'assets',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Minify for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  publicDir: 'public',
  // Ensure proper asset handling
  assetsInclude: ['**/*.ico', '**/*.png', '**/*.svg', '**/*.json'],
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-helmet-async',
      'lucide-react',
      'leaflet',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'web-vitals'
    ],
  },

  // Server configuration for development
  server: {
    port: 5173,
    host: true,
    // Enable HMR
    hmr: {
      overlay: true,
    },
  },

  // Preview configuration
  preview: {
    port: 4173,
    host: true,
  },
});
