/**
 * Garden backup — the answer to D2's one real downside.
 *
 * Everything lives on this phone and nowhere else, which is the whole privacy story
 * (DECISIONS.md D2) and also means losing the phone loses the garden. This writes the
 * whole thing to a JSON file and hands it to the share sheet, so a copy can live in
 * iCloud Drive, Google Drive, an email to yourself — anywhere the user chooses. Nothing
 * is uploaded by Juniper; the user picks the destination.
 *
 * `buildBackup` is pure and node-testable. Only `exportBackup` touches the filesystem.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import type { AppState } from './store';

/**
 * Bumped only when the shape changes in a way an importer would need to branch on.
 * Independent of the AsyncStorage STORAGE_VERSION: this is a file format that may
 * outlive several internal schema versions.
 */
export const BACKUP_FORMAT = 1;

export interface Backup {
  app: 'juniper';
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  profile: { userName: string; archetype: string };
  plants: AppState['plants'];
  log: AppState['log'];
}

export function buildBackup(state: AppState, now: Date = new Date()): Backup {
  return {
    app: 'juniper',
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    profile: { userName: state.userName, archetype: state.archetype },
    plants: state.plants,
    log: state.log,
  };
}

/** "juniper-garden-2026-08-15.json" — sortable, and obvious in a Files app. */
export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `juniper-garden-${y}-${m}-${d}.json`;
}

export type ExportResult =
  | { ok: true; filename: string }
  | { ok: false; reason: 'empty' | 'unavailable' | 'failed' };

/**
 * Write the garden to a file and offer it to the share sheet.
 *
 * The file goes in the CACHE directory, not documents: it is a transient artefact
 * produced for the share sheet, and writing it to documents would quietly accumulate a
 * new copy of the entire garden on every export.
 */
export async function exportBackup(state: AppState, now: Date = new Date()): Promise<ExportResult> {
  if (state.plants.length === 0) return { ok: false, reason: 'empty' };

  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };

  const filename = backupFilename(now);

  try {
    const file = new File(Paths.cache, filename);
    // Overwrite a same-day export rather than failing on the second tap.
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(buildBackup(state, now), null, 2));

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your garden',
      UTI: 'public.json',
    });

    return { ok: true, filename };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------
//
// Restoring REPLACES the garden; it does not merge. See DECISIONS.md D10 — every plant
// carries a `lastWateredISO`, that timestamp is what drives thirst and the reminders,
// and every possible "which timestamp wins?" rule produces a garden nobody chose.
//
// A picked file is untrusted input, so parseBackup validates rather than trusts. It is
// pure, which is what lets the awkward cases be tested properly.

import type { ArchetypeKey, JournalEntry, LogEntry, LogKind, Plant, PlantPhoto } from '../data/types';

const LOG_KINDS: LogKind[] = ['water', 'repot', 'fertilize', 'move', 'note', 'joined', 'observed'];
const ARCHETYPE_KEYS: ArchetypeKey[] = ['whisperer', 'collector', 'forager', 'steady'];

export interface ParsedBackup {
  plants: Plant[];
  log: LogEntry[];
  profile: { userName: string; archetype: ArchetypeKey };
  exportedAt: string | null;
  /** Entries dropped as unusable — surfaced so a partial file is never silently partial. */
  skipped: { plants: number; log: number };
}

export type ParseFailure = 'not-json' | 'not-juniper' | 'future-format' | 'no-plants';

export type ParseResult = { ok: true; data: ParsedBackup } | { ok: false; reason: ParseFailure };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const isoOr = (v: unknown, fallback: string): string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fallback;

/**
 * Coerce one entry into a Plant, or null if it is too broken to be meaningful.
 *
 * Only `id` and `name` are required — a plant without them cannot be shown or watered.
 * Everything else is repaired with a sane default, because losing a whole plant over a
 * missing `temp` field would be a worse outcome than showing it as "warm".
 */
function toPlant(raw: unknown, now: Date): Plant | null {
  if (!isObj(raw)) return null;

  const id = str(raw.id).trim();
  const name = str(raw.name).trim();
  if (!id || !name) return null;

  const waterEvery = Number(raw.waterEvery);

  const photos: PlantPhoto[] = Array.isArray(raw.photos)
    ? raw.photos.filter(isObj).map((p) => ({
        date: str(p.date, now.toISOString().slice(0, 10)),
        label: typeof p.label === 'string' ? p.label : undefined,
        // A uri from another device points at a file that does not exist here. Keep it
        // only if it looks like one of ours; the timeline falls back to a pressing.
        uri: typeof p.uri === 'string' && p.uri.includes('/photos/') ? p.uri : undefined,
      }))
    : [];

  const journal: JournalEntry[] = Array.isArray(raw.journal)
    ? raw.journal.filter(isObj).map((j) => ({ date: str(j.date), text: str(j.text) }))
    : [];

  return {
    id,
    name,
    species: str(raw.species, 'Unknown species'),
    nickname: typeof raw.nickname === 'string' && raw.nickname ? raw.nickname : undefined,
    pressing: (['moss', 'clay', 'deep', 'default'] as readonly string[]).includes(str(raw.pressing))
      ? (raw.pressing as Plant['pressing'])
      : 'moss',
    icon: (typeof raw.icon === 'string' ? raw.icon : 'leaf') as Plant['icon'],
    waterEvery: Number.isFinite(waterEvery) ? Math.min(365, Math.max(1, Math.round(waterEvery))) : 7,
    // An unparseable timestamp becomes "watered now" rather than 1970, which would make
    // the plant instantly, permanently thirsty and fire a reminder on restore.
    lastWateredISO: isoOr(raw.lastWateredISO, now.toISOString()),
    light: str(raw.light, 'bright indirect'),
    temp: str(raw.temp, 'warm'),
    addedISO: isoOr(raw.addedISO, now.toISOString()),
    photos,
    journal,
  };
}

function toLogEntry(raw: unknown, knownPlantIds: Set<string>): LogEntry | null {
  if (!isObj(raw)) return null;
  const plantId = str(raw.plantId);
  const kind = str(raw.kind) as LogKind;
  // Drop entries for plants that are not in the file: an orphan log line renders as a
  // row referring to a plant that does not exist.
  if (!knownPlantIds.has(plantId) || !LOG_KINDS.includes(kind)) return null;
  if (typeof raw.when !== 'string' || Number.isNaN(Date.parse(raw.when))) return null;

  return {
    id: str(raw.id) || `l_${plantId}_${raw.when}`,
    plantId,
    kind,
    text: str(raw.text),
    when: raw.when,
  };
}

/** Validate and repair a backup file's contents. Pure. */
export function parseBackup(rawText: string, now: Date = new Date()): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, reason: 'not-json' };
  }

  if (!isObj(parsed) || parsed.app !== 'juniper') return { ok: false, reason: 'not-juniper' };

  // Refuse a file from a newer Juniper rather than silently dropping fields it added.
  const format = Number(parsed.format);
  if (Number.isFinite(format) && format > BACKUP_FORMAT) return { ok: false, reason: 'future-format' };

  const rawPlants = Array.isArray(parsed.plants) ? parsed.plants : [];
  const plants: Plant[] = [];
  const seen = new Set<string>();
  let skippedPlants = 0;

  for (const entry of rawPlants) {
    const plant = toPlant(entry, now);
    // Duplicate ids would break React keys and make watering ambiguous; first one wins.
    if (!plant || seen.has(plant.id)) {
      skippedPlants += 1;
      continue;
    }
    seen.add(plant.id);
    plants.push(plant);
  }

  if (plants.length === 0) return { ok: false, reason: 'no-plants' };

  const rawLog = Array.isArray(parsed.log) ? parsed.log : [];
  const log: LogEntry[] = [];
  let skippedLog = 0;
  for (const entry of rawLog) {
    const item = toLogEntry(entry, seen);
    if (item) log.push(item);
    else skippedLog += 1;
  }
  log.sort((a, b) => Date.parse(b.when) - Date.parse(a.when)); // newest first, as the store holds it

  const profile = isObj(parsed.profile) ? parsed.profile : {};
  const archetype = str(profile.archetype) as ArchetypeKey;

  return {
    ok: true,
    data: {
      plants,
      log,
      profile: {
        userName: str(profile.userName),
        archetype: ARCHETYPE_KEYS.includes(archetype) ? archetype : 'whisperer',
      },
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
      skipped: { plants: skippedPlants, log: skippedLog },
    },
  };
}

export type ImportResult =
  | { ok: true; data: ParsedBackup }
  | { ok: false; reason: ParseFailure | 'cancelled' | 'unreadable' };

/** Pick a backup file and parse it. Does not touch the store — the caller confirms first. */
export async function pickBackup(now: Date = new Date()): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    // Some providers hand back application/octet-stream for .json, so accept anything
    // and let parseBackup be the real gate.
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.[0]) return { ok: false, reason: 'cancelled' };

  let text: string;
  try {
    text = await new File(picked.assets[0].uri).text();
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  const result = parseBackup(text, now);
  return result.ok ? { ok: true, data: result.data } : { ok: false, reason: result.reason };
}
