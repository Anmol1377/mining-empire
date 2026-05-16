import { defineConfig } from 'vite';

// For GitHub Pages, set `GH_PAGES_BASE=/<repo-name>/` when building:
//   GH_PAGES_BASE=/underground-mining-empire/ npm run build
export default defineConfig({
  base: process.env.GH_PAGES_BASE || '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
