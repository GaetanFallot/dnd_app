import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg', 'favicon.svg'],
      manifest: {
        name: "Roll'n'Roles",
        short_name: "Roll'n'Roles",
        description: 'D&D companion — MJ screen, character sheets, lore builder, maps',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d0d0f',
        theme_color: '#0d0d0f',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['games', 'entertainment', 'utilities'],
      },
      workbox: {
        // The dnd_db bundles (3.5 MB) are cached by runtime rules instead of
        // being baked into the precache, otherwise `workbox-build` chokes on
        // the 2 MB default limit.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['dnd_db/**', 'sounds/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/lore\//, /^\/character\/shared\//],
        runtimeCaching: [
          {
            urlPattern: /^\/dnd_db\/.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dnd-db-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^\/sounds\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sounds-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-v1',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-v1',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
