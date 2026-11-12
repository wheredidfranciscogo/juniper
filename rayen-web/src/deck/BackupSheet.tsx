/**
 * Saving the garden out, and putting one back.
 *
 * WHY THE DECK NEEDS ITS OWN. Export and import live in the grid app's footer, and that
 * was fine while the deck was a page you reached past an address bar. Added to the home
 * screen the deck is the whole app: standalone, no address bar, no way to type `/grid`.
 * The one route to the only copy of the garden was unreachable from the place people
 * actually use — see DECISIONS.md D13 for why that copy is the only one there is.
 *
 * THE FILE IS BUILT ON MOUNT, not on the tap. `navigator.share` has to be called while
 * the tap is still the current user activation, and building the file reads every
 * photograph out of IndexedDB and base64s it. Doing that between the tap and the share
 * is how the share gets refused, so the sheet spends the time it is open preparing and
 * the tap itself does nothing but hand the file over.
 */

import * as React from 'react';

import {
  buildGardenFile,
  canShareGarden,
  gardenAsFile,
  importGardenFile,
  saveGardenFile,
} from '../lib/backup';
import { deletePhotos } from '../lib/photos';
import { useStore } from '../lib/store';

/**
 * When a backup was last taken, so the sheet can say it out loud.
 *
 * Its own key, not part of the garden blob: it describes the garden's copies rather than
 * the garden, and it must not travel inside an export — restoring a file from March
 * should not claim you backed up in March. Storage can be blocked outright, so every
 * access is guarded and a failure just means the line is not shown.
 */
/*
 * THE NAME IN THESE IDENTIFIERS IS DELIBERATELY STILL "juniper". The app was renamed to
 * Rayen on 2026-11-12; these were not, and must not be. They are not labels, they are
 * the address of somebody's garden — a localStorage key, an IndexedDB database, and the
 * magic string every backup file ever written carries. Rename one and the garden is not
 * migrated, it is orphaned: still on disk, under a key nothing reads any more.
 */
const SAVED_KEY = 'juniper.lastBackupISO';

function readLastSaved(): string | null {
  try {
    return window.localStorage.getItem(SAVED_KEY);
  } catch {
    return null;
  }
}

function writeLastSaved(iso: string): void {
  try {
    window.localStorage.setItem(SAVED_KEY, iso);
  } catch {
    /* Not being able to remember this is not worth telling anyone about. */
  }
}

/** Rough and human. A backup is 'today' or 'three weeks ago', never 14:07:33. */
export function howLongAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'recently';
  // A backup taken since this sheet opened reads as slightly in the future against the
  // moment the sheet captured, and 'today' is what a just-saved file actually is.
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? 'about a month ago' : `about ${months} months ago`;
}

export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * How the built file is doing. DELIBERATELY SEPARATE FROM THE OUTCOME MESSAGE below:
 * restoring changes the garden, which re-runs the build, and when the two shared one
 * state the rebuild finished a moment later and wiped 'Garden restored' off the screen
 * before it could be read. A destructive action that reports nothing is the one thing
 * this sheet must not do.
 */
type Prep = 'preparing' | 'ready' | 'failed';

interface Note {
  bad?: boolean;
  text: string;
}

export interface BackupSheetProps {
  onClose: () => void;
}

export function BackupSheet({ onClose }: BackupSheetProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const picker = React.useRef<HTMLInputElement>(null);
  const { userName, plants, log, replaceGarden } = useStore();

  const [prep, setPrep] = React.useState<Prep>('preparing');
  const [built, setBuilt] = React.useState<File | null>(null);
  /** Picked, and waiting to be confirmed. Nothing has been touched yet. */
  const [pending, setPending] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [note, setNote] = React.useState<Note | null>(null);
  const [lastSaved, setLastSaved] = React.useState<string | null>(() => readLastSaved());
  const now = React.useMemo(() => Date.now(), []);

  React.useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Prepare the file for the tap that has not happened yet, and again whenever the
  // garden changes underneath it so what is offered is never a stale garden.
  React.useEffect(() => {
    let spent = false;
    setPrep('preparing');
    (async () => {
      try {
        const payload = gardenAsFile(await buildGardenFile({ userName, plants, log }));
        if (spent) return;
        setBuilt(payload);
        setPrep('ready');
      } catch {
        if (spent) return;
        setPrep('failed');
      }
    })();
    return () => {
      spent = true;
    };
  }, [userName, plants, log]);

  /**
   * No await before `saveGardenFile`. The file is already built; this hands it straight
   * to the share sheet while the tap still counts as a gesture.
   */
  const save = () => {
    if (!built) return;
    void saveGardenFile(built).then((outcome) => {
      if (outcome === 'cancelled') return;
      const iso = new Date().toISOString();
      writeLastSaved(iso);
      setLastSaved(iso);
      setNote({
        text:
          outcome === 'shared'
            ? 'Backup shared. Keep it somewhere that is not this phone.'
            : `Saved as ${built.name}. Keep it somewhere that is not this browser.`,
      });
    });
  };

  /**
   * Back to the first screen. The demo garden is offered on that screen, so there has
   * to be a way out of it; without one the only route was removing eight plants one at
   * a time. `replaceGarden` with nothing in it IS that — no new store action needed.
   */
  const startOver = () => {
    // The store does not touch storage, so the Blobs are this caller's to clean up.
    void deletePhotos(plants.flatMap((plant) => plant.photos.map((photo) => photo.uri)));
    replaceGarden({ plants: [], log: [], profile: { userName } });
    onClose();
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset, or picking the same file twice in one sitting fires no change event.
    e.target.value = '';
    if (file) {
      setNote(null);
      setPending(file);
    }
  };

  const restore = async (file: File) => {
    setPending(null);
    setBusy(true);
    try {
      const result = await importGardenFile(file);
      replaceGarden({ plants: result.plants, log: result.log, profile: result.profile });
      const count = `${result.plants.length} ${result.plants.length === 1 ? 'plant' : 'plants'}`;
      setNote({
        text:
          result.warnings.length > 0
            ? `Garden restored — ${count}. ${result.warnings.join(' ')}`
            : `Garden restored — ${count}.`,
      });
    } catch (err) {
      setNote({
        bad: true,
        text: err instanceof Error ? err.message : 'That file could not be read.',
      });
    } finally {
      setBusy(false);
    }
  };

  const empty = plants.length === 0;
  const count = `${plants.length} ${plants.length === 1 ? 'plant' : 'plants'}`;
  // Said on the button, so it promises the thing that is actually about to happen.
  const shareable = built !== null && canShareGarden(built);
  const saveLabel = empty
    ? 'nothing to back up yet'
    : prep === 'preparing'
      ? 'preparing…'
      : prep === 'failed'
        ? 'could not be built'
        : shareable
          ? 'save a backup'
          : 'download a backup';

  return (
    <dialog ref={dialog} className="sheet" onClose={onClose} onCancel={onClose}>
      <div className="sheet__card">
        <header className="sheet__head">
          <h2 className="sheet__title">Backup</h2>
          <button type="button" className="sheet__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <p className="backup__why">
          Your garden lives in this browser and nowhere else. Clearing site data removes
          it, and so does a new phone. A backup file is the only copy there is.
        </p>

        {lastSaved && <p className="backup__meta">last backup · {howLongAgo(lastSaved, now)}</p>}

        {pending ? (
          <div className="sheet__confirm">
            <span>
              Restore from {pending.name}? It replaces {empty ? 'your empty garden' : count} and
              cannot be undone.
            </span>
            <div className="sheet__confirm-row">
              <button type="button" className="sheet__no" onClick={() => setPending(null)}>
                keep mine
              </button>
              <button type="button" className="sheet__yes" onClick={() => void restore(pending)}>
                restore
              </button>
            </div>
          </div>
        ) : clearing ? (
          <div className="sheet__confirm">
            <span>
              Delete all {count} and start over? This cannot be undone — save a backup
              first if you want to keep this garden.
            </span>
            <div className="sheet__confirm-row">
              <button type="button" className="sheet__no" onClick={() => setClearing(false)}>
                keep mine
              </button>
              <button type="button" className="sheet__yes" onClick={startOver}>
                delete
              </button>
            </div>
          </div>
        ) : (
          <div className="sheet__foot">
            <button
              type="button"
              className="sheet__save"
              onClick={save}
              disabled={prep !== 'ready' || busy || empty}
            >
              {saveLabel}
            </button>

            {built && !empty && prep === 'ready' && (
              <p className="backup__meta">
                {built.name} · {readableSize(built.size)}
              </p>
            )}

            <button
              type="button"
              className="sheet__alt"
              onClick={() => picker.current?.click()}
              disabled={busy}
            >
              {busy ? 'restoring…' : 'restore from a file'}
            </button>

            {!empty && (
              <button type="button" className="sheet__remove" onClick={() => setClearing(true)}>
                start over
              </button>
            )}
          </div>
        )}

        {note && <p className={note.bad ? 'backup__bad' : 'backup__said'}>{note.text}</p>}

        <input
          ref={picker}
          className="backup__picker"
          type="file"
          accept="application/json,.json"
          onChange={pick}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </dialog>
  );
}
