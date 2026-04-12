import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4110,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks: keep router/query/forms in the main bundle (always
        // needed) but pull heavy libs into separate chunks loaded on demand.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xstate')) return 'xstate';
            if (id.includes('@dnd-kit')) return 'dnd';
            if (id.includes('react-i18next') || id.includes('i18next')) return 'i18n';
            if (id.includes('@react-oauth/google')) return 'google-oauth';
          }
        },
      },
    },
  },
});
