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

import { PLANTS_SEED } from '../data/seed';
import type { ArchetypeKey, LogEntry, LogKind, Plant } from '../data/types';

export interface AppState {
  onboarded: boolean;
  userName: string;
  archetype: ArchetypeKey;
  plants: Plant[];
  log: LogEntry[];
}

interface AppActions {
  completeOnboarding: (input: { userName: string; archetype: ArchetypeKey; seed: boolean }) => void;
  waterPlant: (plantId: string) => void;
  logAction: (plantId: string, kind: LogKind, text?: string) => void;
  addPlant: (plant: Plant) => void;
  updatePlant: (plantId: string, patch: Partial<Plant>) => void;
}

type Store = AppState & AppActions & { hydrated: boolean };

const StoreCtx = React.createContext<Store | null>(null);

const STORAGE_KEY = '@juniper/store';
const STORAGE_VERSION = 1;

interface PersistedBlob {
  version: typeof STORAGE_VERSION;
  state: AppState;
}

const initialState: AppState = {
  onboarded: false,
  userName: '',
  archetype: 'whisperer',
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
          const parsed = JSON.parse(raw) as PersistedBlob;
          if (parsed?.version === STORAGE_VERSION && parsed.state) {
            setState(parsed.state);
          }
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
    ({ userName, archetype, seed }) => {
      setState((s) => ({
        ...s,
        onboarded: true,
        userName,
        archetype,
        plants: seed ? PLANTS_SEED : s.plants,
        log: seed
          ? PLANTS_SEED.map((p) => ({
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
        plants: s.plants.map((p) => (p.id === plantId ? { ...p, daysSinceWater: 0 } : p)),
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

  const value = React.useMemo<Store>(
    () => ({ ...state, hydrated, completeOnboarding, waterPlant, logAction, addPlant, updatePlant }),
    [state, hydrated, completeOnboarding, waterPlant, logAction, addPlant, updatePlant],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
