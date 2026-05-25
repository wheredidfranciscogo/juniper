/**
 * In-memory app store. Holds onboarding state, user profile, plants, and log.
 * Phase-1 only — to be replaced with Supabase-backed hooks (task #13).
 */

import * as React from 'react';
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
}

type Store = AppState & AppActions;

const StoreCtx = React.createContext<Store | null>(null);

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

  const value = React.useMemo<Store>(
    () => ({ ...state, completeOnboarding, waterPlant, logAction, addPlant }),
    [state, completeOnboarding, waterPlant, logAction, addPlant],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
