import * as React from 'react';
import { renderHook, act } from '@testing-library/react-native';

import { StoreProvider, useStore } from '../store';
import { PLANTS_SEED } from '../../data/seed';
import type { Plant } from '../../data/types';

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
  daysSinceWater: 2,
  light: 'bright indirect',
  temp: 'warm',
  tendedDays: 10,
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
      result.current.completeOnboarding({ userName: 'June', archetype: 'forager', seed: true });
    });
    expect(result.current.onboarded).toBe(true);
    expect(result.current.userName).toBe('June');
    expect(result.current.archetype).toBe('forager');
    expect(result.current.plants).toHaveLength(PLANTS_SEED.length);
    expect(result.current.log).toHaveLength(PLANTS_SEED.length);
    expect(result.current.log.every((e) => e.kind === 'joined')).toBe(true);
  });

  it('leaves plants and log empty when seed is false', () => {
    const { result } = renderStore();
    act(() => {
      result.current.completeOnboarding({ userName: 'Ada', archetype: 'steady', seed: false });
    });
    expect(result.current.onboarded).toBe(true);
    expect(result.current.plants).toEqual([]);
    expect(result.current.log).toEqual([]);
  });
});

describe('waterPlant', () => {
  it('resets daysSinceWater and prepends a water log entry', () => {
    const { result } = renderStore();
    act(() => result.current.addPlant(makePlant({ id: 'marcel', name: 'Marcel', daysSinceWater: 8 })));
    act(() => result.current.waterPlant('marcel'));

    const marcel = result.current.plants.find((p) => p.id === 'marcel');
    expect(marcel?.daysSinceWater).toBe(0);

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
