/**
 * Export and import a whole garden.
 *
 * THIS MATTERS MORE ON THE WEB THAN IT DID ON THE PHONE. On a phone the app's data sits
 * in a sandbox that survives reinstalls and rides along in the device backup. In a
 * browser it is localStorage plus IndexedDB for one origin, in one browser, on one
 * machine — cleared by "clear site data", by some privacy modes, and by storage pressure
 * on iOS. An export is not a convenience here, it is the only copy. See DECISIONS.md D13.
 *
 * Photographs are inlined as data: URLs so a single file is the whole garden. That makes
 * exports large, which is the right trade: a backup that silently omits the pictures is
 * not a backup.
 *
 * Imports are REPLACEMENTS, not merges — see DECISIONS.md D10. Anything malformed is
 * dropped rather than guessed at, and a file with no usable plants is rejected outright
 * so a bad import cannot quietly wipe a real garden.
 */

import type { JournalEntry, LogEntry, LogKind, Plant, PlantPhoto } from '../data/types';
import { fromDataURL, isStoredPhoto, loadPhoto, savePhoto, toDataURL } from './photos';

/*
 * THIS IDENTIFIER IS AN ADDRESS, NOT A LABEL. It is where somebody's garden lives: a
 * localStorage key, an IndexedDB database name, or the magic string every backup file
 * carries. Renaming one does not migrate a garden, it orphans it — still on disk, under
 * a key nothing reads any more.
 *
 * They were renamed from "juniper" to "rayen" on 2026-11-12, and that was only safe
 * because the app moved to a new domain the same day. Browser storage is per-origin, so
 * the new origin was empty: there was nothing to migrate, and gardens came across in a
 * backup file instead. That is also why readGardenFile still accepts the old format
 * string, and always must. Do not rename these again without writing a real migration.
 */
const FORMAT = 'rayen.garden';
/** Written by every export before the 2026-11-12 rename. Readable forever. */
const LEGACY_FORMAT = 'juniper.garden';
const FORMAT_VERSION = 1;

export interface GardenFile {
  format: typeof FORMAT;
  version: typeof FORMAT_VERSION;
  exportedISO: string;
  profile: { userName: string };
  plants: Plant[];
  log: LogEntry[];
}

export interface ExportInput {
  userName: string;
  plants: Plant[];
  log: LogEntry[];
}

/** Build the file, with every stored photograph inlined. */
export async function buildGardenFile(input: ExportInput, now = new Date()): Promise<GardenFile> {
  const plants = await Promise.all(
    input.plants.map(async (plant) => ({
      ...plant,
      photos: await Promise.all(plant.photos.map(inlinePhoto)),
    })),
  );

  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedISO: now.toISOString(),
    profile: { userName: input.userName },
    plants,
    log: input.log,
  };
}

async function inlinePhoto(photo: PlantPhoto): Promise<PlantPhoto> {
  if (!photo.uri || !isStoredPhoto(photo.uri)) return photo;
  const blob = await loadPhoto(photo.uri);
  if (!blob) {
    // The reference outlived the Blob. Keep the entry's date and label, drop the dead
    // pointer, so the import does not recreate a broken image.
    const { uri: _dropped, ...rest } = photo;
    return rest;
  }
  return { ...photo, uri: await toDataURL(blob) };
}

/** A filename that sorts chronologically and says what it is. */
export function exportFilename(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `rayen-garden-${d}.json`;
}

/** The one place that decides how a garden is written out. */
function gardenText(file: GardenFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * The garden as one File, ready for either the share sheet or the downloads.
 *
 * SEPARATE FROM SAVING IT, because of iOS. `navigator.share` has to be CALLED while the
 * tap that asked for it is still the current user activation, and building this file
 * reads every photograph back out of IndexedDB and base64s it — far too slow to sit
 * between the tap and the share. So a caller builds the file ahead of the tap and
 * spends the gesture itself on `saveGardenFile` and nothing else.
 */
export function gardenAsFile(file: GardenFile, now = new Date()): File {
  return new File([gardenText(file)], exportFilename(now), { type: 'application/json' });
}

/** Hand the file to the browser's downloads. */
export function downloadGarden(file: GardenFile, now = new Date()): void {
  toDownloads(gardenAsFile(file, now));
}

function toDownloads(payload: File): void {
  const url = URL.createObjectURL(payload);
  const a = document.createElement('a');
  a.href = url;
  a.download = payload.name;
  // Some browsers, iOS among them, refuse to fire `download` on a detached element.
  document.body.append(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers; a tick is enough.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 'cancelled' is the share sheet dismissed — the user said no, and nothing went wrong. */
export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Whether this browser will take a garden through the share sheet.
 *
 * Both members are typed as present but neither is: `navigator.share` is absent on
 * desktop Firefox and in any insecure context, so this is a runtime question however
 * confident the types are.
 */
export function canShareGarden(payload: File): boolean {
  try {
    return (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [payload] })
    );
  } catch {
    return false;
  }
}

/**
 * Save a built garden file by whichever route this browser actually honours.
 *
 * WHY THIS IS NOT SIMPLY A DOWNLOAD. Added to the home screen Rayen runs standalone
 * in WKWebView, and there the `download` attribute is not dependable: WebKit has
 * carried a bug for `download` on blob: URLs for years, and in standalone mode the
 * attribute is reported to be ignored outright. Standalone is the exact case this
 * export exists for — it is the mode that stops iOS evicting the garden in the first
 * place — so a download-only button would do nothing on the one platform it is for.
 *
 * The share sheet works in standalone and offers Files, Mail and AirDrop, so it goes
 * first, and the anchor click stays as the fallback for desktop where it is the better
 * of the two. CALL THIS STRAIGHT FROM THE EVENT HANDLER, with no await before it, or
 * the share loses the gesture and Safari refuses it.
 */
export function saveGardenFile(payload: File): Promise<SaveOutcome> {
  if (canShareGarden(payload)) {
    return navigator
      .share({ files: [payload], title: 'Rayen garden' })
      .then<SaveOutcome, SaveOutcome>(
        () => 'shared',
        (err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
          // A refused share target, or a gesture lost on the way here. Neither is
          // something the user can act on, and the download might still work.
          toDownloads(payload);
          return 'downloaded';
        },
      );
  }

  toDownloads(payload);
  return Promise.resolve('downloaded');
}

/* ------------------------------------------------------------------ import ------- */

export interface ImportResult {
  plants: Plant[];
  log: LogEntry[];
  profile: { userName: string };
  /** Non-fatal things that were dropped, to tell the user about rather than hide. */
  warnings: string[];
}

const LOG_KINDS: LogKind[] = [
  'water',
  'repot',
  'fertilize',
  'move',
  'note',
  'joined',
  'observed',
];

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function isoOr(v: unknown, fallback: string): string {
  const s = str(v);
  return s && Number.isFinite(new Date(s).getTime()) ? s : fallback;
}

/**
 * A photograph's uri, if it points somewhere this app would have written.
 *
 * ONLY `data:`. An export inlines every photograph as a data URL, so that is the only
 * scheme a real Rayen file carries. Before this check the field took any string and
 * handed it to an <img src> — which meant a garden file from someone else could make a
 * plant card fetch an arbitrary URL every time it rendered, reporting the reader's IP,
 * user agent and the time back to whoever wrote the file. Not script execution; an
 * <img> will not run `javascript:` or `data:text/html`. A beacon, quietly, forever.
 *
 * `idb:` is deliberately NOT accepted either. It is a reference into THIS browser's
 * IndexedDB, so one arriving from outside names a local blob that is either missing or,
 * worse, somebody else's photograph.
 */
function photoURI(raw: unknown, plantName: string, warnings: string[]): string | undefined {
  const uri = str(raw);
  if (!uri) return undefined;
  if (uri.startsWith('data:')) return uri;
  warnings.push(`A photograph of ${plantName} pointed outside the file and was dropped.`);
  return undefined;
}

/**
 * Parse one plant, or return null if it cannot stand on its own.
 *
 * A plant needs an id and a name; everything else has a defensible default, because
 * dropping a whole plant over a missing `light` string would lose real history over a
 * cosmetic field.
 */
function readPlant(raw: unknown, nowISO: string, warnings: string[]): Plant | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const id = str(p.id);
  const name = str(p.name);
  if (!id || !name) {
    warnings.push('A plant with no name was skipped.');
    return null;
  }

  const every = Number(p.waterEvery);
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const journal = Array.isArray(p.journal) ? p.journal : [];

  return {
    id,
    name,
    species: str(p.species) ?? 'Unknown species',
    nickname: str(p.nickname),
    pressing: (['default', 'moss', 'clay', 'deep'] as const).includes(p.pressing as never)
      ? (p.pressing as Plant['pressing'])
      : 'default',
    icon: (['seedling', 'leaf', 'monstera', 'fern', 'cactus', 'flower', 'herb'] as const).includes(
      p.icon as never,
    )
      ? (p.icon as Plant['icon'])
      : 'leaf',
    waterEvery: Number.isFinite(every) && every >= 1 ? Math.round(every) : 7,
    lastWateredISO: isoOr(p.lastWateredISO, nowISO),
    light: str(p.light) ?? 'bright indirect',
    location:
      p.location === 'indoor' || p.location === 'outdoor' ? p.location : undefined,
    addedISO: isoOr(p.addedISO, nowISO),
    photos: photos
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({
        date: str(x.date) ?? nowISO.slice(0, 10),
        label: str(x.label),
        uri: photoURI(x.uri, name, warnings),
      })),
    journal: journal
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map(
        (x): JournalEntry => ({
          date: str(x.date) ?? nowISO.slice(0, 10),
          text: str(x.text) ?? '',
        }),
      )
      .filter((j) => j.text),
  };
}

/**
 * Validate a parsed file and move its photographs into IndexedDB.
 *
 * Throws only for a file that is not a Rayen garden at all, or one with nothing left
 * to restore. Everything survivable comes back in `warnings`.
 */
export async function readGardenFile(raw: unknown, now = new Date()): Promise<ImportResult> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('That file is not a Rayen garden.');
  }
  const file = raw as Record<string, unknown>;
  if (file.format !== FORMAT && file.format !== LEGACY_FORMAT) {
    throw new Error('That file is not a Rayen garden export.');
  }
  if (Number(file.version) > FORMAT_VERSION) {
    throw new Error(
      'That export came from a newer version of Rayen than this one. Update first.',
    );
  }

  const warnings: string[] = [];
  const nowISO = now.toISOString();

  const plants = (Array.isArray(file.plants) ? file.plants : [])
    .map((p) => readPlant(p, nowISO, warnings))
    .filter((p): p is Plant => p !== null);

  if (plants.length === 0) {
    throw new Error('That export contains no plants, so nothing was changed.');
  }

  // Re-store inlined photographs, swapping each data: URL back for an idb: reference.
  for (const plant of plants) {
    const kept: PlantPhoto[] = [];
    for (const photo of plant.photos) {
      if (!photo.uri?.startsWith('data:')) {
        kept.push(photo);
        continue;
      }
      const blob = await fromDataURL(photo.uri);
      const uri = blob ? await savePhoto(blob) : null;
      if (uri) {
        kept.push({ ...photo, uri });
      } else {
        warnings.push(`A photograph of ${plant.name} could not be saved.`);
        const { uri: _dropped, ...rest } = photo;
        kept.push(rest);
      }
    }
    plant.photos = kept;
  }

  const ids = new Set(plants.map((p) => p.id));
  const rawLog = Array.isArray(file.log) ? file.log : [];
  const log = rawLog
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .filter((x) => str(x.id) && str(x.plantId) && LOG_KINDS.includes(x.kind as LogKind))
    // An entry about a plant that is not in the file renders as a row about nothing.
    .filter((x) => ids.has(x.plantId as string))
    .map(
      (x): LogEntry => ({
        id: x.id as string,
        plantId: x.plantId as string,
        kind: x.kind as LogKind,
        text: str(x.text) ?? '',
        when: isoOr(x.when, nowISO),
      }),
    );

  const orphans = rawLog.length - log.length;
  if (orphans > 0) {
    warnings.push(`${orphans} log ${orphans === 1 ? 'entry' : 'entries'} referred to nothing and were dropped.`);
  }

  const profile = (file.profile ?? {}) as Record<string, unknown>;

  return { plants, log, profile: { userName: str(profile.userName) ?? '' }, warnings };
}

/** Read a picked file and validate it. */
export async function importGardenFile(file: File, now = new Date()): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file could not be read as JSON.');
  }
  return readGardenFile(parsed, now);
}
