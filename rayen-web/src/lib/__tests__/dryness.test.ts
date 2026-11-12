/**
 * Dryness is the whole information content of the garden grid, so it is tested the way
 * watering.ts is: pure, with an explicit clock, and against the cases that would make
 * the grid lie rather than merely look wrong.
 */

import { byThirst, dryness, drynessLabel, drynessStage } from '../dryness';
import type { Plant } from '../../data/types';

const NOW = new Date('2026-11-07T10:00:00');

function plantAt(daysAgo: number, waterEvery: number, over: Partial<Plant> = {}): Plant {
  const last = new Date(NOW);
  last.setDate(last.getDate() - daysAgo);
  return {
    id: `p_${daysAgo}_${waterEvery}`,
    name: 'Marcel',
    species: 'Monstera deliciosa',
    pressing: 'moss',
    icon: 'monstera',
    waterEvery,
    lastWateredISO: last.toISOString(),
    light: 'bright indirect',
    addedISO: new Date('2026-01-01T00:00:00').toISOString(),
    photos: [],
    journal: [],
    ...over,
  } as Plant;
}

describe('dryness', () => {
  it('is 0 the day a plant is watered', () => {
    expect(dryness(plantAt(0, 7), NOW)).toBe(0);
  });

  it('rises linearly across the cadence', () => {
    expect(dryness(plantAt(1, 4), NOW)).toBeCloseTo(0.25);
    expect(dryness(plantAt(2, 4), NOW)).toBeCloseTo(0.5);
    expect(dryness(plantAt(3, 4), NOW)).toBeCloseTo(0.75);
  });

  it('reaches exactly 1 on the day it is due', () => {
    expect(dryness(plantAt(7, 7), NOW)).toBe(1);
  });

  // The decision this file exists to protect (D12). A plant three days late must look
  // identical to a plant due today: the ramp saturates and stops. If this ever returns
  // more than 1 the grid has started keeping score.
  it('HOLDS at 1 past due, however late', () => {
    expect(dryness(plantAt(8, 7), NOW)).toBe(1);
    expect(dryness(plantAt(30, 7), NOW)).toBe(1);
    expect(dryness(plantAt(400, 7), NOW)).toBe(1);
  });

  it('never goes below 0, even with a future timestamp', () => {
    expect(dryness(plantAt(-5, 7), NOW)).toBe(0);
  });

  it('survives a cadence of zero rather than dividing by it', () => {
    const d = dryness(plantAt(3, 0), NOW);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBe(1);
  });

  it('survives a negative cadence', () => {
    expect(dryness(plantAt(3, -7), NOW)).toBe(1);
  });

  it('treats an unparseable timestamp as just watered rather than as due', () => {
    // Better to under-report than to tell someone a plant needs water on no evidence.
    expect(dryness(plantAt(5, 7, { lastWateredISO: 'not a date' }), NOW)).toBe(0);
  });

  it('is unaffected by the time of day', () => {
    const morning = new Date('2026-11-07T06:00:00');
    const night = new Date('2026-11-07T23:30:00');
    const p = plantAt(3, 7);
    expect(dryness(p, morning)).toBeCloseTo(dryness(p, night));
  });
});

describe('drynessStage', () => {
  it('bands the ramp for the things colour cannot carry', () => {
    expect(drynessStage(plantAt(0, 10), NOW)).toBe('fresh');
    expect(drynessStage(plantAt(5, 10), NOW)).toBe('fresh');
    expect(drynessStage(plantAt(6, 10), NOW)).toBe('drying');
    expect(drynessStage(plantAt(9, 10), NOW)).toBe('drying');
    expect(drynessStage(plantAt(10, 10), NOW)).toBe('due');
    expect(drynessStage(plantAt(40, 10), NOW)).toBe('due');
  });
});

describe('drynessLabel', () => {
  it('names the plant and the wait, so the tile is not colour-only', () => {
    expect(drynessLabel(plantAt(0, 7), NOW)).toBe('Marcel, 7 days to go');
    expect(drynessLabel(plantAt(6, 7), NOW)).toBe('Marcel, due tomorrow');
    expect(drynessLabel(plantAt(7, 7), NOW)).toBe('Marcel, due for water');
  });

  // Same decision as the ramp holding: no "overdue by 9 days" anywhere.
  it('does not count how late a plant is', () => {
    const late = drynessLabel(plantAt(40, 7), NOW);
    expect(late).toBe('Marcel, due for water');
    expect(late).not.toMatch(/overdue|late|missed|\d+\s*days? ago/i);
  });
});

describe('byThirst', () => {
  it('puts the thirstiest first', () => {
    const fresh = plantAt(0, 7, { id: 'fresh', name: 'Fresh' });
    const due = plantAt(7, 7, { id: 'due', name: 'Due' });
    const mid = plantAt(4, 7, { id: 'mid', name: 'Mid' });
    const order = [fresh, due, mid].sort((a, b) => byThirst(a, b, NOW)).map((p) => p.id);
    expect(order).toEqual(['due', 'mid', 'fresh']);
  });

  // A grid whose squares move on their own is unreadable — position is half of what
  // makes a plant recognisable at a glance.
  it('breaks ties on name so the layout is stable across renders', () => {
    const b = plantAt(3, 7, { id: 'b', name: 'Bruno' });
    const a = plantAt(3, 7, { id: 'a', name: 'Alma' });
    expect([b, a].sort((x, y) => byThirst(x, y, NOW)).map((p) => p.name)).toEqual([
      'Alma',
      'Bruno',
    ]);
    // Same input in the other order must give the same output.
    expect([a, b].sort((x, y) => byThirst(x, y, NOW)).map((p) => p.name)).toEqual([
      'Alma',
      'Bruno',
    ]);
  });

  it('does not separate two plants that are equally overdue by how overdue they are', () => {
    const late = plantAt(9, 7, { id: 'late', name: 'Zed' });
    const later = plantAt(90, 7, { id: 'later', name: 'Abe' });
    // Both saturate at 1, so the only ordering left is the name.
    expect([late, later].sort((x, y) => byThirst(x, y, NOW)).map((p) => p.name)).toEqual([
      'Abe',
      'Zed',
    ]);
  });
});
