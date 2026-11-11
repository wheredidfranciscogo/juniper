import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /*
   * BOTH PAGES ARE BUILT, not just index.html.
   *
   * Vite's dev server happily serves any .html in the project root, so /deck.html worked
   * for months in dev — but `vite build` takes ONLY index.html unless told otherwise, and
   * the deck was silently absent from every production bundle. Nothing fails: you deploy,
   * open /deck.html and get a 404 on a page that works perfectly at home.
   *
   * Plain relative paths rather than resolve(__dirname, …): this project has no
   * @types/node, and Vite resolves these against `root` anyway.
   */
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        deck: 'deck.html',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
