/**
 * Plant photographs.
 *
 * Photos are the one piece of a garden too big for the JSON blob, so they live in
 * IndexedDB as Blobs and the blob stores only a reference: `plant.photos[].uri` holds
 * `idb:<id>`. That keeps the localStorage record small — it has a ~5MB ceiling that two
 * phone photographs would blow straight through — and it keeps the store itself free of
 * any storage API, exactly as the native app kept photos out of AsyncStorage.
 *
 * Every function here resolves rather than throws when IndexedDB is unavailable (private
 * windows, blocked site data). A garden with missing pictures still works; the pressing
 * illustration is the designed fallback and takes over on its own.
 */

const DB_NAME = 'juniper';
const DB_VERSION = 1;
const STORE = 'photos';

/** `idb:` marks a uri this module owns. Anything else (a data: or http: url) is left alone. */
const PREFIX = 'idb:';

export function isStoredPhoto(uri: string | undefined): boolean {
  return typeof uri === 'string' && uri.startsWith(PREFIX);
}

export function photoId(uri: string): string {
  return uri.slice(PREFIX.length);
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    // Another tab holding an old version open would otherwise hang this forever.
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDB().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = run(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

/** Store a picked file and return the uri to put on the plant, or null if it could not be saved. */
export async function savePhoto(file: Blob): Promise<string | null> {
  const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const ok = await tx('readwrite', (s) => s.put(file, id) as IDBRequest<IDBValidKey>);
  return ok === null ? null : `${PREFIX}${id}`;
}

export async function loadPhoto(uri: string): Promise<Blob | null> {
  if (!isStoredPhoto(uri)) return null;
  return tx<Blob>('readonly', (s) => s.get(photoId(uri)) as IDBRequest<Blob>);
}

export async function deletePhoto(uri: string): Promise<void> {
  if (!isStoredPhoto(uri)) return;
  await tx('readwrite', (s) => s.delete(photoId(uri)) as IDBRequest<undefined>);
}

/**
 * Drop every photo belonging to a plant being removed.
 *
 * Called by the caller rather than by the store, which does not touch storage — the same
 * split the native app used. Failures are ignored: an orphaned Blob wastes a little
 * space, while a thrown error here would abort a deletion the user asked for.
 */
export async function deletePhotos(uris: (string | undefined)[]): Promise<void> {
  await Promise.all(uris.filter(isStoredPhoto).map((u) => deletePhoto(u as string)));
}

/** A Blob as a data: URL, for export. */
export function toDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** A data: URL back to a Blob, for import. Returns null on anything malformed. */
export async function fromDataURL(url: string): Promise<Blob | null> {
  if (!url.startsWith('data:')) return null;
  try {
    return await (await fetch(url)).blob();
  } catch {
    return null;
  }
}
