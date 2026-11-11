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

const FORMAT = 'juniper.garden';
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
  return `juniper-garden-${d}.json`;
}

/** Hand the file to the browser's downloads. */
export function downloadGarden(file: GardenFile, now = new Date()): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename(now);
  document.body.append(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers; a tick is enough.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        uri: str(x.uri),
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
 * Throws only for a file that is not a Juniper garden at all, or one with nothing left
 * to restore. Everything survivable comes back in `warnings`.
 */
export async function readGardenFile(raw: unknown, now = new Date()): Promise<ImportResult> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('That file is not a Juniper garden.');
  }
  const file = raw as Record<string, unknown>;
  if (file.format !== FORMAT) {
    throw new Error('That file is not a Juniper garden export.');
  }
  if (Number(file.version) > FORMAT_VERSION) {
    throw new Error(
      'That export came from a newer version of Juniper than this one. Update first.',
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
