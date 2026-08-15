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
