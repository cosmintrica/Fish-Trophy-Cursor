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
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    chunkSizeWarningLimit: 5000,
  },
  publicDir: 'public',
  optimizeDeps: {
    include: [],
    exclude: [],
  },
});
