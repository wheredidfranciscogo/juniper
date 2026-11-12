/**
 * App store — profile, plants, and log.
 *
 * Ported from the native app's lib/store.tsx. The reducer logic, the versioned blob and
 * the v1→v2 migration are unchanged; only the storage call sites differ. There are two
 * meaningful differences from the native original:
 *
 * 1. HYDRATION IS SYNCHRONOUS. localStorage reads without a promise, so the first render
 *    already has the real garden. The native version read AsyncStorage in an effect,
 *    which meant one frame of empty state and a `hydrated` flag that half the app had to
 *    check. The flag is kept, always true, so ported callers keep working — but nothing
 *    needs to wait any more.
 *
 * 2. A FAILED WRITE IS NOT SILENT. localStorage throws when the quota is full or when
 *    the browser is blocking site data, and in a browser the stored blob is the ONLY
 *    copy of the garden — there is no phone backup behind it. Swallowing that error
 *    would let someone tend a garden all month that was never being saved, so the write
 *    error is surfaced as `storageError` and the shell shows it. See DECISIONS.md D13.
 */

import * as React from 'react';

import { plantsSeed } from '../data/seed';
import type { LogEntry, LogKind, Plant } from '../data/types';

export interface AppState {
  onboarded: boolean;
  userName: string;
  plants: Plant[];
  log: LogEntry[];
}

interface AppActions {
  completeOnboarding: (input: { userName: string; seed: boolean }) => void;
  waterPlant: (plantId: string) => void;
  logAction: (plantId: string, kind: LogKind, text?: string) => void;
  addPlant: (plant: Plant) => void;
  updatePlant: (plantId: string, patch: Partial<Plant>) => void;
  /**
   * Remove a plant and everything the log recorded about it. The log goes with it
   * deliberately: an entry whose plant no longer exists renders as a row about nothing,
   * and the importer treats such orphans as corrupt and drops them, so leaving them
   * would mean an export that cannot round-trip.
   */
  removePlant: (plantId: string) => void;
  /**
   * Replace the entire garden — used by import. Not a merge: see DECISIONS.md D10 for
   * why blending two sets of `lastWateredISO` produces a garden nobody chose.
   */
  replaceGarden: (input: {
    plants: Plant[];
    log: LogEntry[];
    profile: { userName: string };
  }) => void;
}

type Store = AppState &
  AppActions & {
    hydrated: boolean;
    /** Set when persistence is failing. Null when the last write succeeded. */
    storageError: string | null;
  };

const StoreCtx = React.createContext<Store | null>(null);

/*
 * THE NAME IN THESE IDENTIFIERS IS DELIBERATELY STILL "juniper". The app was renamed to
 * Rayen on 2026-11-12; these were not, and must not be. They are not labels, they are
 * the address of somebody's garden — a localStorage key, an IndexedDB database, and the
 * magic string every backup file ever written carries. Rename one and the garden is not
 * migrated, it is orphaned: still on disk, under a key nothing reads any more.
 */
const STORAGE_KEY = '@juniper/store';
const STORAGE_VERSION = 2;

interface PersistedBlob {
  version: typeof STORAGE_VERSION;
  state: AppState;
}

/** v1 plants stored a relative counter; v2 stores an absolute timestamp. */
interface PlantV1 extends Omit<Plant, 'lastWateredISO'> {
  daysSinceWater?: number;
}

/**
 * Bring a persisted blob up to the current schema, or return null if it can't be.
 *
 * v1 -> v2: `daysSinceWater: number` becomes `lastWateredISO: string`. The counter was
 * frozen the moment it was written (nothing ever incremented it), so the best available
 * reading is "that many days before now" — which is exactly what it meant when saved.
 */
export function migrate(raw: unknown): AppState | null {
  const blob = raw as { version?: number; state?: AppState } | null;
  if (!blob?.state) return null;

  if (blob.version === STORAGE_VERSION) return blob.state;

  if (blob.version === 1) {
    const now = Date.now();
    return {
      ...blob.state,
      plants: (blob.state.plants as unknown as PlantV1[]).map((p) => {
        const { daysSinceWater, ...rest } = p;
        const days = typeof daysSinceWater === 'number' ? Math.max(0, daysSinceWater) : 0;
        return { ...rest, lastWateredISO: new Date(now - days * 86_400_000).toISOString() };
      }),
    };
  }

  // Unknown / future version — discard rather than guess.
  return null;
}

const initialState: AppState = {
  onboarded: false,
  userName: '',
  plants: [],
  log: [],
};

/**
 * Read the saved garden, or fall back to a fresh one.
 *
 * Every failure mode here ends in `initialState` rather than an exception: a browser
 * with site data blocked throws on access, a corrupt blob throws on parse, and a blob
 * from a future version is deliberately discarded by `migrate`. None of those should
 * stop the app loading.
 */
function readState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return migrate(JSON.parse(raw)) ?? initialState;
  } catch {
    return initialState;
  }
}

export function uid(prefix = 'l') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function actionVerb(kind: LogKind, plantName: string): string {
  switch (kind) {
    case 'water':
      return `Watered ${plantName}.`;
    case 'repot':
      return `Repotted ${plantName}.`;
    case 'fertilize':
      return `Fed ${plantName} a measured dose.`;
    case 'move':
      return `Moved ${plantName} to a new spot.`;
    case 'joined':
      return `${plantName} joined you.`;
    case 'observed':
      return '';
    case 'note':
      return '';
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Synchronous: the first render already has the real garden.
  const [state, setState] = React.useState<AppState>(readState);
  const [storageError, setStorageError] = React.useState<string | null>(null);

  // Persist on change. The first run writes back what was just read, which is harmless
  // and has the useful side effect of surfacing a broken localStorage immediately
  // rather than at the first watering.
  React.useEffect(() => {
    const blob: PersistedBlob = { version: STORAGE_VERSION, state };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
      setStorageError(null);
    } catch (err) {
      setStorageError(
        err instanceof DOMException && err.name === 'QuotaExceededError'
          ? 'This browser is out of storage, so your garden is not being saved. Export it now.'
          : 'This browser is not saving your garden. Export it now, and check whether site data is blocked.',
      );
    }
  }, [state]);

  const completeOnboarding = React.useCallback<AppActions['completeOnboarding']>(
    ({ userName, seed }) => {
      const garden = seed ? plantsSeed() : null;
      setState((s) => ({
        ...s,
        onboarded: true,
        userName,
        plants: garden ?? s.plants,
        log: garden
          ? garden.map((p) => ({
              id: uid('l'),
              plantId: p.id,
              kind: 'joined' as LogKind,
              text: `${p.name} joined you.`,
              when: p.addedISO,
            }))
          : s.log,
      }));
    },
    [],
  );

  const waterPlant = React.useCallback<AppActions['waterPlant']>((plantId) => {
    setState((s) => {
      const plant = s.plants.find((p) => p.id === plantId);
      if (!plant) return s;
      const when = new Date().toISOString();
      return {
        ...s,
        plants: s.plants.map((p) => (p.id === plantId ? { ...p, lastWateredISO: when } : p)),
        log: [
          { id: uid('l'), plantId, kind: 'water', text: actionVerb('water', plant.name), when },
          ...s.log,
        ],
      };
    });
  }, []);

  const logAction = React.useCallback<AppActions['logAction']>((plantId, kind, text) => {
    setState((s) => {
      const plant = s.plants.find((p) => p.id === plantId);
      if (!plant) return s;
      return {
        ...s,
        log: [
          {
            id: uid('l'),
            plantId,
            kind,
            text: text ?? actionVerb(kind, plant.name),
            when: new Date().toISOString(),
          },
          ...s.log,
        ],
      };
    });
  }, []);

  const addPlant = React.useCallback<AppActions['addPlant']>((plant) => {
    setState((s) => ({
      ...s,
      plants: [...s.plants, plant],
      log: [
        {
          id: uid('l'),
          plantId: plant.id,
          kind: 'joined',
          text: `${plant.name} joined you.`,
          when: plant.addedISO,
        },
        ...s.log,
      ],
    }));
  }, []);

  const updatePlant = React.useCallback<AppActions['updatePlant']>((plantId, patch) => {
    setState((s) => {
      if (!s.plants.some((p) => p.id === plantId)) return s;
      return {
        ...s,
        plants: s.plants.map((p) => (p.id === plantId ? { ...p, ...patch, id: p.id } : p)),
      };
    });
  }, []);

  const removePlant = React.useCallback<AppActions['removePlant']>((plantId) => {
    setState((s) => {
      if (!s.plants.some((p) => p.id === plantId)) return s;
      return {
        ...s,
        plants: s.plants.filter((p) => p.id !== plantId),
        log: s.log.filter((e) => e.plantId !== plantId),
      };
    });
  }, []);

  const replaceGarden = React.useCallback<AppActions['replaceGarden']>(
    ({ plants, log, profile }) => {
      setState((s) => ({
        ...s,
        onboarded: true,
        userName: profile.userName || s.userName,
        plants,
        log,
      }));
    },
    [],
  );

  const value = React.useMemo<Store>(
    () => ({
      ...state,
      hydrated: true,
      storageError,
      completeOnboarding,
      waterPlant,
      logAction,
      addPlant,
      updatePlant,
      removePlant,
      replaceGarden,
    }),
    [
      state,
      storageError,
      completeOnboarding,
      waterPlant,
      logAction,
      addPlant,
      updatePlant,
      removePlant,
      replaceGarden,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
