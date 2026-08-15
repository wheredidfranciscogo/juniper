import type { Plant } from '../../data/types';
import { durationLabel, formatCount, gardenStats, tendedDays } from '../stats';

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'p1',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: '2026-08-01T09:00:00.000Z',
  light: 'bright indirect',
  temp: 'warm',
  addedISO: '2025-09-17',
  photos: [],
  journal: [],
  ...over,
});

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0, 0);

describe('tendedDays', () => {
  it('counts days since the plant joined', () => {
    const p = plant({ addedISO: local(2026, 8, 1).toISOString() });
    expect(tendedDays(p, local(2026, 8, 9))).toBe(8);
  });

  it('is 0 on the day it was added', () => {
    const p = plant({ addedISO: local(2026, 8, 9).toISOString() });
    expect(tendedDays(p, local(2026, 8, 9))).toBe(0);
  });

  it('grows with the clock instead of staying frozen', () => {
    // The old model stored tendedDays as a number that nothing incremented, so Plant
    // Detail read "TENDED FOR 247 DAYS" forever — and the seed's stored values had
    // already drifted out of step with their own addedISO.
    const p = plant({ addedISO: local(2026, 1, 1).toISOString() });
    expect(tendedDays(p, local(2026, 6, 1))).toBeGreaterThan(tendedDays(p, local(2026, 3, 1)));
  });

  it('never goes negative for a future join date', () => {
    expect(tendedDays(plant({ addedISO: local(2027, 1, 1).toISOString() }), local(2026, 8, 9))).toBe(0);
  });

  it('returns 0 rather than NaN for an unparseable date', () => {
    expect(tendedDays(plant({ addedISO: 'whenever' }), local(2026, 8, 9))).toBe(0);
  });
});

describe('gardenStats', () => {
  const now = local(2026, 8, 9);

  it('is all zeroes and nulls for an empty garden', () => {
    expect(gardenStats([], now)).toEqual({
      plantCount: 0,
      thirstyCount: 0,
      longest: null,
      plantDays: 0,
    });
  });

  it('counts plants and sums plant-days', () => {
    const plants = [
      plant({ id: 'a', addedISO: local(2026, 8, 1).toISOString() }), // 8 days
      plant({ id: 'b', addedISO: local(2026, 8, 4).toISOString() }), // 5 days
    ];
    const s = gardenStats(plants, now);
    expect(s.plantCount).toBe(2);
    expect(s.plantDays).toBe(13);
  });

  it('names the longest-tended plant', () => {
    const plants = [
      plant({ id: 'a', name: 'Pip', addedISO: local(2026, 8, 1).toISOString() }),
      plant({ id: 'b', name: 'Atlas', addedISO: local(2025, 8, 1).toISOString() }),
    ];
    expect(gardenStats(plants, now).longest?.name).toBe('Atlas');
  });

  it('counts only the thirsty plants', () => {
    const plants = [
      plant({ id: 'a', waterEvery: 3, lastWateredISO: local(2026, 8, 1).toISOString() }),
      plant({ id: 'b', waterEvery: 30, lastWateredISO: local(2026, 8, 8).toISOString() }),
    ];
    expect(gardenStats(plants, now).thirstyCount).toBe(1);
  });
});

describe('durationLabel', () => {
  it('handles the small end', () => {
    expect(durationLabel(0)).toBe('today');
    expect(durationLabel(1)).toBe('1 day');
    expect(durationLabel(312)).toBe('312 days');
  });

  it('switches to years past a year', () => {
    expect(durationLabel(365)).toBe('1 year');
    expect(durationLabel(400)).toBe('1 year, 1 month');
    expect(durationLabel(800)).toBe('2 years, 2 months');
  });
});

describe('formatCount', () => {
  it('separates thousands', () => {
    expect(formatCount(1204)).toBe('1,204');
    expect(formatCount(42)).toBe('42');
  });
});
