// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fumadocs from '@fumadocs/astro';
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// React and Solid both compile .tsx: Solid only owns src/demos/solid.
const solidFiles = ['**/demos/solid/**'];

export default defineConfig({
  integrations: [
    react({ exclude: solidFiles }),
    solid({ include: solidFiles }),
    vue(),
    svelte(),
    fumadocs({
      components: './src/components/mdx.tsx',
      includeProcessedMarkdown: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
