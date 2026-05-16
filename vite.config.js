import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// For GitHub Pages, set `GH_PAGES_BASE=/<repo-name>/` when building:
//   GH_PAGES_BASE=/mining-empire/ npm run build
export default defineConfig({
  base: process.env.GH_PAGES_BASE || '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'Mining Empire',
        short_name: 'Mining Empire',
        description: 'Browser-based incremental mining & automation game.',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            // DiceBear avatars: cache aggressively (same seed = same image)
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dicebear-avatars',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Never cache Supabase: state is dynamic
            urlPattern: /supabase\.co/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false, // turn on to test SW in `npm run dev`
      },
    }),
  ],
});
