// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { fingerprint, workerSource } from '../../../offline.plugin';

/**
 * The service worker is written out as a string at build time, so nothing type-checks it
 * and nothing lints it. These tests are what stands in for both: they run the real source
 * against a fake browser and hold it to its three rules — pages network-first and never
 * written back, bundles cache-first, fonts kept as they pass through.
 *
 * What they cannot show is a real phone with no signal. That was checked by hand, against
 * a production build served with vercel.json's headers and then with the server killed.
 */

const ORIGIN = 'https://rayen.test';
const FILES = ['/', '/grid', '/assets/main-abc.js'];

type Handler = (event: FakeEvent) => void;

interface FakeEvent {
  request?: { url: string; method: string; mode: string };
  waitUntil: (work: Promise<unknown>) => void;
  respondWith: (answer: Promise<Response>) => void;
}

function boot(version = 'v1') {
  const stores = new Map<string, Map<string, Response>>();
  const key = (target: unknown) => {
    const raw = typeof target === 'string' ? target : (target as { url: string }).url;
    return new URL(raw, ORIGIN).href;
  };
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        match: async (target: unknown) => store.get(key(target))?.clone(),
        put: async (target: unknown, response: Response) => void store.set(key(target), response),
        addAll: async (targets: unknown[]) => {
          for (const target of targets) store.set(key(target), new Response(`cached ${key(target)}`));
        },
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };

  const network = { up: true, asked: [] as string[] };
  const fetch = async (request: { url: string }) => {
    network.asked.push(request.url);
    if (!network.up) throw new TypeError('offline');
    return new Response(`network ${request.url}`);
  };

  const handlers = new Map<string, Handler>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => void handlers.set(type, handler),
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  class FakeRequest {
    url: string;
    constructor(url: string) {
      this.url = new URL(url, ORIGIN).href;
    }
  }

  new Function('self', 'caches', 'fetch', 'Request', 'Response', 'URL', workerSource(FILES, version))(
    self, caches, fetch, FakeRequest, Response, URL,
  );

  const lifecycle = async (type: 'install' | 'activate') => {
    let work: Promise<unknown> = Promise.resolve();
    handlers.get(type)!({ waitUntil: (w) => void (work = w), respondWith: () => undefined });
    await work;
  };

  /** Returns the response body, or null when the worker left the request alone. */
  const ask = async (path: string, mode = 'no-cors') => {
    let answer: Promise<Response> | null = null;
    handlers.get('fetch')!({
      request: { url: new URL(path, ORIGIN).href, method: 'GET', mode },
      waitUntil: () => undefined,
      respondWith: (a) => void (answer = a),
    });
    return answer ? (await (answer as Promise<Response>)).text() : null;
  };

  return { stores, network, lifecycle, ask };
}

describe('the service worker', () => {
  it('caches the whole app on install, under this build’s name', async () => {
    const worker = boot('v1');
    await worker.lifecycle('install');

    const shell = worker.stores.get('rayen-shell-v1');
    expect([...shell!.keys()]).toEqual(FILES.map((file) => ORIGIN + file));
  });

  it('serves a page from the network when there is one, and does not keep it', async () => {
    const worker = boot();
    await worker.lifecycle('install');

    expect(await worker.ask('/', 'navigate')).toBe(`network ${ORIGIN}/`);
    // A fresh page may name bundles this worker never fetched. It must not enter the cache.
    expect(await worker.stores.get('rayen-shell-v1')!.get(`${ORIGIN}/`)!.clone().text()).toBe(
      `cached ${ORIGIN}/`,
    );
  });

  it('serves the cached page when the network is gone', async () => {
    const worker = boot();
    await worker.lifecycle('install');
    worker.network.up = false;

    expect(await worker.ask('/grid', 'navigate')).toBe(`cached ${ORIGIN}/grid`);
    // A path with no page of its own still opens the app rather than an error.
    expect(await worker.ask('/somewhere-else', 'navigate')).toBe(`cached ${ORIGIN}/`);
  });

  it('serves bundles from the cache without asking the network', async () => {
    const worker = boot();
    await worker.lifecycle('install');

    expect(await worker.ask('/assets/main-abc.js')).toBe(`cached ${ORIGIN}/assets/main-abc.js`);
    expect(worker.network.asked).toEqual([]);

    // A newer page asking for a bundle this worker does not have just goes to the network.
    expect(await worker.ask('/assets/main-newer.js')).toBe(`network ${ORIGIN}/assets/main-newer.js`);
  });

  it('keeps fonts as they pass through, and has them when the network is gone', async () => {
    const worker = boot();
    const font = 'https://fonts.gstatic.com/s/sourceserif4/v15/face.woff2';

    expect(await worker.ask(font, 'cors')).toBe(`network ${font}`);
    worker.network.up = false;
    expect(await worker.ask(font, 'cors')).toBe(`network ${font}`);
  });

  it('leaves every other origin alone', async () => {
    const worker = boot();
    expect(await worker.ask('https://example.com/anything.js')).toBeNull();
  });

  it('drops the previous build’s cache on activate, and keeps the fonts', async () => {
    const old = boot('v1');
    await old.lifecycle('install');
    await old.ask('https://fonts.googleapis.com/css2?family=X', 'cors');

    // A new build's worker starts against whatever the old one left behind.
    const next = boot('v2');
    for (const [name, store] of old.stores) next.stores.set(name, store);
    await next.lifecycle('install');
    await next.lifecycle('activate');

    expect([...next.stores.keys()].sort()).toEqual(['rayen-fonts', 'rayen-shell-v2']);
  });
});

describe('the build fingerprint', () => {
  it('is stable for the same build and different for a different one', () => {
    expect(fingerprint('a|b|c')).toBe(fingerprint('a|b|c'));
    expect(fingerprint('a|b|c')).not.toBe(fingerprint('a|b|d'));
    expect(fingerprint('a|b|c')).toMatch(/^[a-z0-9]+$/);
  });
});
