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
        name: 'NBA Sport — ลูกค้า',
        short_name: 'NBA Customer',
        description: 'NBA Sport customer self-service app',
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
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
