import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: false, // HTTP pentru a evita mixed content cu netlify dev
    // Note: Web Crypto API funcționează pe HTTP pe localhost (doar pe IP-uri de rețea necesită HTTPS)
    port: 5173,
    host: '0.0.0.0', // Allow access from network (for mobile testing)
    strictPort: true, // Prevent port fallback
    hmr: {
      overlay: false, // Disable error overlay to reduce console noise
      // HMR va folosi automat host-ul server-ului (0.0.0.0 permite acces din rețea)
      protocol: 'ws', // WebSocket protocol
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // ✅ OPTIMIZARE: Activează minificare (esbuild e mai rapid și mai sigur decât terser)
    // Notă: esbuild nu suportă drop_console, dar e mai rapid și mai sigur
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ✅ OPTIMIZARE: Separă doar MapLibre (foarte mare) - restul împreună pentru a evita dependențe circulare
          if (id.includes('node_modules')) {
            // MapLibre GL (mare) - separat pentru lazy loading
            if (id.includes('maplibre-gl')) {
              return 'vendor-maplibre';
            }
            // Toate celelalte vendor-uri împreună (evită dependențe circulare)
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 5000,
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['swr', 'react', 'react-dom'],
    exclude: [],
  },
});
