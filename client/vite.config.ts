import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: true, // HTTPS required for Web Crypto API on local IP (192.168.x.x)
    port: 5173,
    host: '0.0.0.0', // Allow access from network (for mobile testing)
    strictPort: true, // Prevent port fallback
    hmr: {
      overlay: false, // Disable error overlay to reduce console noise
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
