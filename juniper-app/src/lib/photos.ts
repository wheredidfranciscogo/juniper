/**
 * Photo storage.
 *
 * WHY THIS EXISTS: expo-image-picker hands back a URI inside the app's CACHE directory.
 * The OS is free to clear that whenever it wants storage back, so a photo whose cache
 * URI was saved straight into the store would work perfectly in testing and then quietly
 * turn into a broken image weeks later. Every picked image is copied into the app's
 * document directory first, and only that copy's URI is ever stored.
 *
 * Photos are files, not store data — which is what keeps the AsyncStorage blob small no
 * matter how many are taken (DECISIONS.md D2).
 */

import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIR = 'photos';

/** File extension from a URI, defaulting to .jpg. Query strings and fragments stripped. */
export function extensionFor(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(clean);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext !== 'tmp' ? `.${ext}` : '.jpg';
}

/** Collision-proof name — the picker's own filenames are not unique across sessions. */
export function photoFilename(uri: string, seed = `${Date.now()}${Math.random()}`): string {
  const stamp = seed.replace(/[^a-z0-9]/gi, '').slice(0, 18);
  return `p_${stamp}${extensionFor(uri)}`;
}

function photosDir(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Copy a picked image into permanent storage and return the durable URI.
 * Returns null if the copy fails, so callers can decline to store a URI that
 * would render as a broken image later.
 */
export async function savePhoto(sourceUri: string): Promise<string | null> {
  try {
    const source = new File(sourceUri);
    if (!source.exists) return null;

    const destination = new File(photosDir(), photoFilename(sourceUri));
    source.copy(destination);
    return destination.uri;
  } catch {
    return null;
  }
}

/**
 * Delete a stored photo. Only touches files inside our own photo directory, so a
 * bad or foreign URI can never be used to delete something else.
 */
export async function deletePhoto(uri: string): Promise<void> {
  try {
    if (!uri.includes(`/${PHOTO_DIR}/`)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort: an orphaned file costs a few KB and is not worth surfacing.
  }
}
