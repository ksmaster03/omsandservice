import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NBA Sport — ช่าง',
        short_name: 'NBA Tech',
        description: 'NBA Sport service technician app',
        theme_color: '#0C1016',
        background_color: '#0C1016',
        display: 'standalone',
        lang: 'th',
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 4130,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4100', changeOrigin: true },
    },
  },
});
