import * as React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StoreProvider, useStore } from '../store';
import { plantsSeed } from '../../data/seed';
import type { Plant } from '../../data/types';

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  mockedAsyncStorage.getItem.mockReset().mockResolvedValue(null);
  mockedAsyncStorage.setItem.mockReset().mockResolvedValue(undefined);
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

const renderStore = () => renderHook(() => useStore(), { wrapper });

const makePlant = (over: Partial<Plant> = {}): Plant => ({
  id: 'fern1',
  name: 'Fernando',
  species: 'Nephrolepis exaltata',
  pressing: 'moss',
  icon: 'fern',
  waterEvery: 7,
  lastWateredISO: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  light: 'bright indirect',
  addedISO: '2026-05-01',
  photos: [],
  journal: [],
  ...over,
});

describe('useStore', () => {
  it('throws when used outside a provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useStore())).toThrow(
      'useStore must be used within <StoreProvider>',
    );
    spy.mockRestore();
  });

  it('starts un-onboarded with no plants or log', () => {
    const { result } = renderStore();
    expect(result.current.onboarded).toBe(false);
    expect(result.current.plants).toEqual([]);
    expect(result.current.log).toEqual([]);
  });
});

describe('completeOnboarding', () => {
  it('seeds plants and a "joined" log entry per plant when seed is true', () => {
    const { result } = renderStore();
    act(() => {
      result.current.completeOnboarding({ userName: 'June', seed: true });
    });
    expect(result.current.onboarded).toBe(true);
    expect(result.current.userName).toBe('June');
    expect(result.current.plants).toHaveLength(plantsSeed().length);
    expect(result.current.log).toHaveLength(plantsSeed().length);
    expect(result.current.log.every((e) => e.kind === 'joined')).toBe(true);
  });

  it('leaves plants and log empty when seed is false', () => {
    const { result } = renderStore();
    act(() => {
      result.current.completeOnboarding({ userName: 'Ada', seed: false });
    });
    expect(result.current.onboarded).toBe(true);
    expect(result.current.plants).toEqual([]);
    expect(result.current.log).toEqual([]);
  });
});

describe('waterPlant', () => {
  it('stamps lastWateredISO to now and prepends a water log entry', () => {
    const { result } = renderStore();
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    act(() =>
      result.current.addPlant(
        makePlant({ id: 'marcel', name: 'Marcel', lastWateredISO: eightDaysAgo }),
      ),
    );
    act(() => result.current.waterPlant('marcel'));

    const marcel = result.current.plants.find((p) => p.id === 'marcel');
    // Watering must move the timestamp to now, not merely zero a counter — that bug is
    // exactly why a plant could previously never become thirsty a second time.
    expect(marcel?.lastWateredISO).not.toBe(eightDaysAgo);
    expect(Date.now() - Date.parse(marcel!.lastWateredISO)).toBeLessThan(5_000);

    const newest = result.current.log[0];
    expect(newest.kind).toBe('water');
    expect(newest.plantId).toBe('marcel');
    expect(newest.text).toBe('Watered Marcel.');
  });

  it('is a no-op for an unknown plant id', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant()));
    const before = result.current.log.length;
    act(() => result.current.waterPlant('ghost'));
    expect(result.current.log).toHaveLength(before);
  });
});

describe('logAction', () => {
  it('uses the supplied text verbatim', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'pip', name: 'Pip' })));
    act(() => result.current.logAction('pip', 'note', 'Looking leggy.'));
    expect(result.current.log[0].text).toBe('Looking leggy.');
  });

  it('falls back to a generated verb when no text is given', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'pip', name: 'Pip' })));
    act(() => result.current.logAction('pip', 'fertilize'));
    expect(result.current.log[0].text).toBe('Fed Pip a measured dose.');
  });
});

describe('addPlant', () => {
  it('appends the plant and prepends a joined log entry', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'olive', name: 'Olive' })));
    expect(result.current.plants.map((p) => p.id)).toContain('olive');
    expect(result.current.log[0]).toMatchObject({ plantId: 'olive', kind: 'joined' });
  });
});

describe('updatePlant', () => {
  it('merges the patch into the matching plant', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'marcel', name: 'Marcel', waterEvery: 7 })));

    act(() => result.current.updatePlant('marcel', { name: 'Marcel II', waterEvery: 10 }));

    const updated = result.current.plants.find((p) => p.id === 'marcel');
    expect(updated?.name).toBe('Marcel II');
    expect(updated?.waterEvery).toBe(10);
    // Untouched fields are preserved.
    expect(updated?.species).toBe('Nephrolepis exaltata');
  });

  it('does not change the plant id even if the patch tries to', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'marcel', name: 'Marcel' })));

    act(() => result.current.updatePlant('marcel', { id: 'hijacked' } as unknown as Partial<Plant>));

    expect(result.current.plants.map((p) => p.id)).toContain('marcel');
    expect(result.current.plants.map((p) => p.id)).not.toContain('hijacked');
  });

  it('is a no-op for an unknown plant id', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'marcel', name: 'Marcel' })));
    const before = result.current.plants;

    act(() => result.current.updatePlant('ghost', { name: 'Phantom' }));

    expect(result.current.plants).toBe(before);
  });
});

describe('replaceGarden', () => {
  const restored = [makePlant({ id: 'a', name: 'Alpha' }), makePlant({ id: 'b', name: 'Beta' })];
  const profile = { userName: 'Restored' };

  it('replaces the whole garden rather than merging into it', () => {
    // Merging is the decision this action exists to avoid — see DECISIONS.md D10.
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'existing', name: 'Existing' })));

    act(() => result.current.replaceGarden({ plants: restored, log: [], profile }));

    expect(result.current.plants.map((p) => p.id)).toEqual(['a', 'b']);
    expect(result.current.plants.map((p) => p.id)).not.toContain('existing');
  });

  it('replaces the log too, so no entry outlives the plant it referred to', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'existing', name: 'Existing' })));
    expect(result.current.log.length).toBeGreaterThan(0);

    act(() => result.current.replaceGarden({ plants: restored, log: [], profile }));
    expect(result.current.log).toEqual([]);
  });

  it('marks the app onboarded, so restoring on a fresh install lands in the app', () => {
    // Without this the route guard bounces straight back to the onboarding questions
    // with a fully restored garden sitting behind it.
    const { result } = renderStore();
    expect(result.current.onboarded).toBe(false);

    act(() => result.current.replaceGarden({ plants: restored, log: [], profile }));

    expect(result.current.onboarded).toBe(true);
    expect(result.current.userName).toBe('Restored');
  });

  it('keeps the existing name when the backup has none', () => {
    const { result } = renderStore();
    act(() =>
      result.current.completeOnboarding({ userName: 'June', seed: false }),
    );

    act(() =>
      result.current.replaceGarden({
        plants: restored,
        log: [],
        profile: { userName: '' },
      }),
    );

    expect(result.current.userName).toBe('June');
  });
});

describe('persistence', () => {
  it('starts with hydrated=false and flips to true once AsyncStorage resolves', async () => {
    const { result } = renderStore();
    expect(result.current.hydrated).toBe(false);
    await waitFor(() => expect(result.current.hydrated).toBe(true));
  });

  it('restores onboarded state from a previously saved blob', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        state: {
          onboarded: true,
          userName: 'Restored',
          archetype: 'forager',
          plants: [makePlant({ id: 'restored', name: 'Restored Plant' })],
          log: [],
        },
      }),
    );
    const { result } = renderStore();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.onboarded).toBe(true);
    expect(result.current.userName).toBe('Restored');
    expect(result.current.plants.map((p) => p.id)).toEqual(['restored']);
  });

  it('ignores a persisted blob with a mismatched version', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        version: 999,
        state: { ...({} as object), onboarded: true, userName: 'Stale' },
      }),
    );
    const { result } = renderStore();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.onboarded).toBe(false);
    expect(result.current.userName).toBe('');
  });

  it('migrates a v1 blob, converting daysSinceWater into lastWateredISO', async () => {
    // v1 stored a frozen day-count. Anyone who ran the app before the schema change has
    // one of these on disk, and discarding it would wipe their garden.
    const v1Plant = {
      id: 'marcel',
      name: 'Marcel',
      species: 'Monstera deliciosa',
      pressing: 'moss',
      icon: 'monstera',
      waterEvery: 7,
      daysSinceWater: 8,
      light: 'bright indirect',
      addedISO: '2025-09-17',
      photos: [],
      journal: [],
    };
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        state: { onboarded: true, userName: 'June', archetype: 'steady', plants: [v1Plant], log: [] },
      }),
    );

    const { result } = renderStore();
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.userName).toBe('June');
    const marcel = result.current.plants[0] as Plant & { daysSinceWater?: number };
    expect(marcel.daysSinceWater).toBeUndefined();

    // "8 days since watered" becomes a timestamp 8 days back, so the plant stays thirsty
    // rather than silently resetting to freshly-watered on upgrade.
    const daysBack = Math.round((Date.now() - Date.parse(marcel.lastWateredISO)) / 86_400_000);
    expect(daysBack).toBe(8);
  });

  it('discards a blob from an unknown future version rather than guessing', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ version: 99, state: { onboarded: true, userName: 'Future' } }),
    );
    const { result } = renderStore();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.onboarded).toBe(false);
  });

  it('survives a corrupt persisted blob without throwing', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('not json {{{');
    const { result } = renderStore();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.onboarded).toBe(false);
  });

  it('saves to AsyncStorage on state change after hydration', async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    mockedAsyncStorage.setItem.mockClear();

    act(() => {
      result.current.completeOnboarding({ userName: 'June', seed: false });
    });

    await waitFor(() => {
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });
    const [key, value] = mockedAsyncStorage.setItem.mock.calls[0];
    expect(key).toBe('@juniper/store');
    const blob = JSON.parse(value);
    expect(blob.version).toBe(2);
    expect(blob.state.onboarded).toBe(true);
    expect(blob.state.userName).toBe('June');
  });

  it('does not overwrite saved state with initialState before hydration', async () => {
    // If the persistence effect fires before hydration, it would wipe a real
    // saved state with the empty initialState — a classic store-rehydration bug.
    mockedAsyncStorage.getItem.mockImplementationOnce(
      () => new Promise(() => {
        // Never resolves — hydration never completes during this test window.
      }),
    );
    renderStore();
    // Give microtasks a chance to flush; setItem must remain unbcalled.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
