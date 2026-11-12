import type { Plugin } from 'vite';

/*
 * THE SERVICE WORKER, and the build step that writes it.
 *
 * Installed to the home screen, Rayen kept its garden through a week of neglect but still
 * needed the network to draw its first frame — a watering app that will not open in the
 * garden. This is what lets it open anywhere.
 *
 * It is written out at build time rather than kept as a static file, for one reason: a
 * browser only reinstalls a service worker when the worker's own bytes change. The list of
 * hashed bundle files is therefore baked into it, so a new deploy is a new worker, and a
 * new worker fetches a complete new copy of the app before it replaces the old one. There
 * is never a moment when the cache holds one version's page and another version's code.
 *
 * Three rules, and the reasons for each:
 *
 *   PAGES ARE NETWORK-FIRST. Online you always get the newest deploy; the cached page is
 *   only for when the network is not there. The fresh page is deliberately NOT written
 *   back to the cache — it may name bundles this worker never downloaded, and the cache
 *   must only ever hold a set that works together.
 *
 *   BUNDLES ARE CACHE-FIRST. Their names carry a content hash, so a cached one is never
 *   stale, and a miss (a newer page asking for newer bundles) just goes to the network.
 *
 *   FONTS ARE CACHED AS THEY ARE USED, in a cache of their own that survives deploys. They
 *   come from Google, so they cannot be in the list above. This is also why the stylesheet
 *   <link>s carry `crossorigin` (an opaque response cannot be checked before it is kept)
 *   and why connect-src in vercel.json names the two font hosts: a worker's own fetches
 *   are governed by connect-src, not by style-src or font-src.
 *
 * It lives in a string because this project has no @types/node to read a file with, and
 * src/lib/__tests__/offline.test.ts parses it so a typo here fails a test, not a phone.
 */

const PAGES = ['/', '/grid'];

export function workerSource(files: string[], version: string): string {
  return `// Written by offline.plugin.ts at build time. Do not edit; it is replaced on every build.
const SHELL = 'rayen-shell-${version}';
const FONTS = 'rayen-fonts';
const FILES = ${JSON.stringify(files)};
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('rayen-shell-') && name !== SHELL)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(FONTS, request, true));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => cachedPage(url.pathname)));
    return;
  }
  event.respondWith(cacheFirst(SHELL, request, false));
});

function cachedPage(pathname) {
  return caches
    .open(SHELL)
    .then((cache) => cache.match(pathname).then((hit) => hit || cache.match('/')))
    .then((hit) => hit || Response.error());
}

function cacheFirst(name, request, keep) {
  return caches.open(name).then((cache) =>
    cache.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (keep && response.ok) cache.put(request, response.clone());
          return response;
        }),
    ),
  );
}
`;
}

/** FNV-1a. Not cryptography — just a short, stable name for "this exact build". */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function offline(): Plugin {
  return {
    name: 'rayen-offline',
    apply: 'build',
    // After Vite's own plugins, so the HTML and CSS it emits are already in the bundle.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const names = Object.keys(bundle).sort();
      const pages = names.filter((name) => name.endsWith('.html'));
      if (pages.length !== PAGES.length) {
        this.error(`offline: expected ${PAGES.length} pages in the bundle, found ${pages.length}`);
      }

      const files = [...PAGES, ...names.filter((name) => !name.endsWith('.html')).map((name) => `/${name}`)];

      // The pages are in the version as well as the bundles: an edit to index.html that
      // touches no script changes no hashed filename, and would otherwise ship unnoticed.
      const markup = pages
        .map((name) => {
          const entry = bundle[name];
          return entry && entry.type === 'asset' ? String(entry.source) : '';
        })
        .join('');

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: workerSource(files, fingerprint(files.join('|') + markup)),
      });
    },
  };
}
