/**
 * App store — onboarding state, profile, plants, and log.
 * Hydrated from AsyncStorage on mount and persisted on every state change
 * so the app survives reloads. Versioned for forward compatibility; if the
 * schema changes, bump STORAGE_VERSION and the persisted blob is ignored.
 *
 * This is the permanent storage layer, not a stopgap. Juniper holds a few dozen
 * plants and an append-only event log, read whole on every screen — a versioned
 * JSON blob is the right shape for that. There is no backend and none is planned.
 * See juniper-design/DECISIONS.md D2.
 */

import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
   * Replace the entire garden — used by backup restore. Not a merge: see
   * DECISIONS.md D10 for why blending two sets of `lastWateredISO` produces a garden
   * nobody chose. Reminders reschedule on their own, because useReminderSync watches
   * `plants` and this changes the whole array.
   */
  replaceGarden: (input: {
    plants: Plant[];
    log: LogEntry[];
    profile: { userName: string };
  }) => void;
}

type Store = AppState & AppActions & { hydrated: boolean };

const StoreCtx = React.createContext<Store | null>(null);

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
function migrate(raw: unknown): AppState | null {
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

function uid(prefix = 'l') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function actionVerb(kind: LogKind, plantName: string): string {
  switch (kind) {
    case 'water': return `Watered ${plantName}.`;
    case 'repot': return `Repotted ${plantName}.`;
    case 'fertilize': return `Fed ${plantName} a measured dose.`;
    case 'move': return `Moved ${plantName} to a new spot.`;
    case 'joined': return `${plantName} joined you.`;
    case 'observed': return '';
    case 'note': return '';
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted state once on mount.
  React.useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const migrated = migrate(JSON.parse(raw));
          if (migrated) setState(migrated);
        } catch {
          // Corrupt blob — fall through to initialState; next save overwrites it.
        }
      })
      .catch(() => {
        // AsyncStorage is unavailable — proceed without persistence.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on state change, but only after hydration so the initialState
  // render doesn't overwrite a real saved state.
  React.useEffect(() => {
    if (!hydrated) return;
    const blob: PersistedBlob = { version: STORAGE_VERSION, state };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob)).catch(() => {});
  }, [state, hydrated]);

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
      return {
        ...s,
        plants: s.plants.map((p) =>
          p.id === plantId ? { ...p, lastWateredISO: new Date().toISOString() } : p,
        ),
        log: [
          { id: uid('l'), plantId, kind: 'water', text: actionVerb('water', plant.name), when: new Date().toISOString() },
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
          { id: uid('l'), plantId, kind, text: text ?? actionVerb(kind, plant.name), when: new Date().toISOString() },
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
        { id: uid('l'), plantId: plant.id, kind: 'joined', text: `${plant.name} joined you.`, when: plant.addedISO },
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

  const replaceGarden = React.useCallback<AppActions['replaceGarden']>(
    ({ plants, log, profile }) => {
      setState((s) => ({
        ...s,
        // Restoring into a fresh install must leave the app past onboarding — otherwise
        // the route guard bounces straight back to the questions with a full garden.
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
      hydrated,
      completeOnboarding,
      waterPlant,
      logAction,
      addPlant,
      updatePlant,
      replaceGarden,
    }),
    [state, hydrated, completeOnboarding, waterPlant, logAction, addPlant, updatePlant, replaceGarden],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
