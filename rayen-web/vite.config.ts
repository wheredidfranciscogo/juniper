import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /*
   * BOTH PAGES ARE BUILT, and the DECK is index.html.
   *
   * Two things were wrong before. First, `vite build` takes only index.html unless told
   * otherwise — the dev server serves any root .html, so /deck.html worked for months
   * while being absent from every production bundle. Second, the deck was the secondary
   * page, and no amount of config fixes that: a Vercel rewrite from `/` to `/deck.html`
   * is dead on arrival, because static filesystem routing resolves `/` to index.html
   * before rewrites are consulted. Measured on the live deployment, which quietly served
   * the grid at `/`.
   *
   * So the deck IS index.html, which is also simply true — it is the app now. The grid
   * keeps its export/import screen at /grid, which a rewrite CAN serve, because no file
   * sits at that path to beat it.
   *
   * Plain relative paths rather than resolve(__dirname, …): this project has no
   * @types/node, and Vite resolves these against `root` anyway.
   */
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        grid: 'grid.html',
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
