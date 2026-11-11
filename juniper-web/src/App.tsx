/**
 * Juniper, on the web.
 *
 * One screen: the garden as a grid. Every plant is a square whose field drifts from moss
 * to dried as it goes from watered to due, the drop in a square's corner waters it
 * without leaving the grid, and tapping a square grows it into the full record.
 *
 * There is no tab bar, because there is nothing to put in it. The native app had Today,
 * Garden, Log and You; the grid replaced the first two (D12), and of the other two, Log
 * was a list of things the grid already shows and You was mostly notification settings
 * that no longer exist. Export and import live in the footer, where a thing you touch
 * twice a year belongs.
 */

import * as React from 'react';

import './styles/base.css';
import './styles/pressing.css';
import './styles/tile.css';
import './styles/grid.css';
import './styles/peek.css';
import './styles/buttons.css';
import './styles/shell.css';

import type { Plant } from './data/types';
import { StoreProvider, useStore } from './lib/store';
import { byThirst, dryness, drynessLabel } from './lib/dryness';
import { daysSinceWatered } from './lib/watering';
import { greetingFor } from './lib/today-utils';
import { useNow } from './lib/use-now';
import { savePhoto, deletePhotos } from './lib/photos';
import { buildGardenFile, downloadGarden, importGardenFile } from './lib/backup';
import { PlantTile } from './components/PlantTile';
import { PlantPeek } from './components/PlantPeek';
import { AddPlant } from './components/AddPlant';
import { IconPlus } from './components/icons';

export default function App() {
  return (
    <StoreProvider>
      <Garden />
    </StoreProvider>
  );
}

interface OpenState {
  id: string;
  rect: DOMRect;
}

function Garden() {
  const {
    plants,
    log,
    userName,
    onboarded,
    storageError,
    completeOnboarding,
    waterPlant,
    addPlant,
    updatePlant,
    removePlant,
    replaceGarden,
  } = useStore();

  const now = useNow();
  const [open, setOpen] = React.useState<OpenState | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  /**
   * Thirstiest first — but FROZEN WHILE YOU ARE LOOKING AT IT.
   *
   * The order is recomputed only when the set of plants changes, not when one of them
   * is watered. Sorting on every change looked obviously right and was obviously wrong
   * the first time it was seen on a screen: watering a plant dropped its thirst to zero,
   * which sent its square flying to the far end of the grid. You tap a drop and the
   * thing you touched teleports, so the one moment the design exists to make satisfying
   * instead loses the plant.
   *
   * Freezing on the id set gives both halves: a page opened in the morning leads with
   * what needs water, and a square you water stays exactly where your thumb left it and
   * sinks back to moss in place. The next load re-sorts.
   */
  const key = plants
    .map((p) => p.id)
    .sort()
    .join('\u0000');
  const ordered = React.useMemo(
    () => [...plants].sort((a, b) => byThirst(a, b, new Date())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  /**
   * ...but `ordered` holds the plant objects captured when the order was computed, so
   * watering one would leave a stale copy on screen. Re-read each by id.
   */
  const shown = React.useMemo(
    () =>
      ordered
        .map((p) => plants.find((q) => q.id === p.id))
        .filter((p): p is Plant => p !== undefined),
    [ordered, plants],
  );

  const thirsty = shown.filter((p) => dryness(p, now) >= 1).length;
  const openPlant = plants.find((p) => p.id === open?.id) ?? null;

  /** Store a picked file and hang it on the plant as its newest photograph. */
  const attachPhoto = React.useCallback(
    async (plant: Plant, file: File) => {
      const uri = await savePhoto(file);
      if (!uri) {
        setNotice('That photograph could not be saved — this browser may be out of space.');
        return;
      }
      updatePlant(plant.id, {
        photos: [{ date: new Date().toISOString().slice(0, 10), uri }, ...plant.photos],
      });
    },
    [updatePlant],
  );

  const remove = React.useCallback(
    (plant: Plant) => {
      // The store does not touch storage, so the Blobs are this caller's to clean up —
      // the same split the native app used for the filesystem.
      void deletePhotos(plant.photos.map((p) => p.uri));
      removePlant(plant.id);
    },
    [removePlant],
  );

  const exportGarden = async () => {
    try {
      downloadGarden(await buildGardenFile({ userName, plants, log }));
    } catch {
      setNotice('The export could not be built.');
    }
  };

  const importGarden = async (file: File) => {
    try {
      const result = await importGardenFile(file);
      replaceGarden({ plants: result.plants, log: result.log, profile: result.profile });
      setNotice(
        result.warnings.length > 0
          ? `Garden restored. ${result.warnings.join(' ')}`
          : `Garden restored — ${result.plants.length} ${result.plants.length === 1 ? 'plant' : 'plants'}.`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'That file could not be imported.');
    }
  };

  if (!onboarded) {
    return <Welcome onStart={completeOnboarding} onImport={importGarden} notice={notice} />;
  }

  return (
    <main className="shell">
      <header className="header">
        <h1 className="greeting">
          {greetingFor(now)}
          {userName ? `, ${userName}` : ''}
        </h1>
        <span className="overline">{subtitle(plants.length, thirsty)}</span>
      </header>

      {storageError && (
        <p className="storage-warning" role="alert">
          {storageError}
        </p>
      )}
      {notice && (
        <p className="storage-warning" role="status">
          {notice}{' '}
          <button type="button" onClick={() => setNotice(null)} className="peek__remove">
            Dismiss
          </button>
        </p>
      )}

      {plants.length === 0 ? (
        <p className="empty">No plants yet. Add your first with the button below.</p>
      ) : (
        <ul className="grid">
          {shown.map((plant) => (
            <li key={plant.id}>
              <PlantTile
                plant={plant}
                dryness={dryness(plant, now)}
                label={drynessLabel(plant, now)}
                wateredToday={daysSinceWatered(plant, now) === 0}
                onOpen={(rect) => setOpen({ id: plant.id, rect })}
                onWater={() => waterPlant(plant.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <footer className="footer">
        <button type="button" onClick={exportGarden} data-testid="export">
          Export your garden
        </button>
        <ImportButton onFile={importGarden} />
        <p>
          Juniper keeps your garden in this browser only. Nothing is uploaded, and nothing
          is backed up — so export it somewhere safe now and again.
        </p>
      </footer>

      <button
        type="button"
        className="add-plant"
        onClick={() => setAdding(true)}
        data-testid="add-plant-button"
      >
        <IconPlus size={18} stroke={1.75} />
        Add a plant
      </button>

      {openPlant && open && (
        <PlantPeek
          plant={openPlant}
          from={open.rect}
          now={now}
          onClose={() => setOpen(null)}
          onWater={() => waterPlant(openPlant.id)}
          onAddPhoto={(file) => void attachPhoto(openPlant, file)}
          onRemove={() => remove(openPlant)}
        />
      )}

      {adding && (
        <AddPlant
          onClose={() => setAdding(false)}
          onAdd={(plant, photo) => {
            addPlant(plant);
            if (photo) void attachPhoto(plant, photo);
            setAdding(false);
          }}
        />
      )}
    </main>
  );
}

/** "6 plants in your care · 2 ready for water" — a count, not a verdict. */
export function subtitle(total: number, thirsty: number): string {
  const plants = `${total} plant${total === 1 ? '' : 's'} in your care`;
  if (thirsty === 0) return plants;
  return `${plants} · ${thirsty} ready for water`;
}

function ImportButton({ onFile }: { onFile: (file: File) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} data-testid="import">
        Import an export
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        data-testid="import-file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}

/**
 * First run. A name, and a choice between one example plant and an empty garden.
 *
 * The example plant is Marcel, who arrives with a year of photographs and already a day
 * past due — so a new garden shows what Juniper looks like in use rather than what it
 * looks like empty. He is one plant, not six, and removing him takes two clicks.
 */
function Welcome({
  onStart,
  onImport,
  notice,
}: {
  onStart: (input: { userName: string; seed: boolean }) => void;
  onImport: (file: File) => void;
  notice: string | null;
}) {
  const [name, setName] = React.useState('');

  return (
    <main className="shell welcome">
      <h1 className="welcome__title">Juniper</h1>
      <p className="welcome__blurb">A quiet record of the plants in your care.</p>

      {notice && (
        <p className="storage-warning" role="alert">
          {notice}
        </p>
      )}

      <form
        className="welcome__form"
        onSubmit={(e) => {
          e.preventDefault();
          onStart({ userName: name.trim(), seed: true });
        }}
      >
        <label className="field">
          <span>What should we call you?</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            data-testid="welcome-name"
          />
        </label>

        <div className="sheet__actions">
          <button type="submit" className="btn btn--primary" data-testid="welcome-start">
            Start with an example
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            data-testid="welcome-empty"
            onClick={() => onStart({ userName: name.trim(), seed: false })}
          >
            Start empty
          </button>
        </div>
      </form>

      <p className="welcome__restore">
        Been here before? <ImportButton onFile={onImport} />
      </p>
    </main>
  );
}
