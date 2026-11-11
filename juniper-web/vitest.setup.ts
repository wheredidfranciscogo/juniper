import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';

/**
 * jsdom does not implement <dialog>.
 *
 * `showModal()` is missing entirely, so a component that opens one throws on mount and
 * the test fails for a reason that has nothing to do with the behaviour under test.
 * This is the smallest shim that makes the element behave the way the components rely
 * on: `open` reflects, and `close()` fires. The focus trap and inert background are the
 * browser's and are not simulated — nothing here asserts them.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.show = function show() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(returnValue?: string) {
    this.open = false;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}

/**
 * jsdom here exposes `sessionStorage` but not `localStorage`.
 *
 * Without this the store silently takes its "storage is unavailable" path — it is
 * written to survive a browser with site data blocked — so every test would pass
 * against a garden that never persisted, and nothing would ever exercise the real
 * read-write cycle. A plain in-memory implementation is enough: the store only uses
 * getItem and setItem, and the suite only needs clear() between tests.
 */
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(String(k)) ?? null,
      setItem: (k: string, v: string) => void store.set(String(k), String(v)),
      removeItem: (k: string) => void store.delete(String(k)),
      clear: () => store.clear(),
    } satisfies Storage,
  });
}

/**
 * Each test starts with an empty garden rather than the last one's.
 *
 * Guarded because this setup file runs for every suite, including the pure ones that
 * touch no DOM at all and may run without a storage object at all.
 */
function clearStore() {
  try {
    globalThis.localStorage?.clear();
  } catch {
    // No storage in this environment, or it is blocked. Nothing to clear.
  }
}

beforeEach(clearStore);
afterEach(clearStore);
