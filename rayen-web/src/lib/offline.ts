/**
 * Ask the browser to install the service worker (see offline.plugin.ts for what it does).
 *
 * Production only: in dev there is no sw.js, and a worker caching a dev server's modules
 * is a bad afternoon. Failure is swallowed on purpose — offline is something the app gains,
 * not something it needs, and a browser that refuses a worker should still get a garden.
 */

const FONT_HOST = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

export function registerOffline(): void {
  // import.meta.env is Vite's, and this project does not pull in vite/client types.
  const production = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD;
  if (!production || !('serviceWorker' in navigator)) return;

  /*
   * The worker caches fonts as they pass through it, and on the very first visit none do:
   * the page fetched them before there was a worker to see it. So the moment the worker
   * takes this page over, ask for the same files again, through it. They come straight
   * back out of the browser's own cache, and from then on the worker holds them too.
   * Without this, "installed once, then opened offline" draws the whole app in fallback type.
   */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    for (const entry of performance.getEntriesByType('resource')) {
      if (FONT_HOST.test(entry.name)) void fetch(entry.name).catch(() => undefined);
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
