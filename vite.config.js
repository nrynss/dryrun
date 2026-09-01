import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import netlify from '@netlify/vite-plugin';

// netlify() gives AI Gateway + functions inside plain `vite dev`,
// so there is no separate `netlify dev` process to keep in sync.
export default defineConfig({
  plugins: [svelte(), netlify()],
});
