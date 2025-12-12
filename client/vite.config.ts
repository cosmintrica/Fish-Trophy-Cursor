import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Note: Web Crypto API funcționează pe HTTP pe localhost (doar pe IP-uri de rețea necesită HTTPS)
    port: 5173,
    host: '0.0.0.0', // Allow access from network (for mobile testing)
    strictPort: true, // Prevent port fallback
    // Reduce file watcher load to prevent ECONNRESET errors
    watch: {
      // Only watch source files, exclude node_modules and build outputs
      ignored: [
        '**/node_modules/**', 
        '**/dist/**', 
        '**/.git/**', 
        '**/.vite/**',
        '**/coverage/**',
        '**/.next/**',
        '**/build/**',
        '**/out/**',
        '**/.netlify/**',
        '**/supabase/.branches/**',
        '**/supabase/.temp/**',
      ],
      // Use polling as fallback for better stability on Windows
      usePolling: false, // Try native first, fallback to polling if needed
      interval: 100, // Polling interval if enabled
    },
    // Increase timeout to prevent premature connection resets
    hmr: {
      // HMR configuration for Netlify Dev
      // When browser accesses through Netlify Dev proxy (8889), WebSocket must also use 8889
      // When browser accesses directly (5173), WebSocket uses 5173
      protocol: 'ws',
      // clientPort tells browser which port to connect to for WebSocket
      // Netlify Dev sets NETLIFY_DEV=true, so we use that to detect proxy mode
      // If not set, Vite will auto-detect from request (works for direct access)
      clientPort: process.env.NETLIFY_DEV === 'true' ? 8889 : undefined,
      // Increase timeout to prevent connection resets
      timeout: 60000, // 60 seconds
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
    include: ['swr', 'react', 'react-dom', 'recharts'],
    exclude: [],
  },
});
