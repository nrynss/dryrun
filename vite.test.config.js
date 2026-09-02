import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Test-only Vite setup. Browser regressions use their own ephemeral HTTP
// ports, and SSR tests load modules directly, so neither needs HMR or the
// Netlify dev integration. Keeping this separate leaves the production/dev
// configuration unchanged while allowing node:test files to run in parallel.
export default defineConfig({
  plugins: [svelte()],
  server: { hmr: false, ws: false },
});
