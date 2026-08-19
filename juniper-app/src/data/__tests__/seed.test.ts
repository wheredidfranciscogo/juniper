import { plantsSeed } from '../seed';
import { isThirsty } from '../../lib/watering';

describe('the example plant a fresh install starts with', () => {
  it('is exactly one plant — not a demo garden to clear out', () => {
    expect(plantsSeed()).toHaveLength(1);
  });

  it('gives it the fields the store and every screen rely on', () => {
    const [plant] = plantsSeed();
    expect(plant.id).toBeTruthy();
    expect(plant.name).toBeTruthy();
    expect(plant.species).toBeTruthy();
    expect(typeof plant.waterEvery).toBe('number');
    expect(Number.isNaN(Date.parse(plant.lastWateredISO))).toBe(false);
    expect(Number.isNaN(Date.parse(plant.addedISO))).toBe(false);
    expect(plant.location).toBe('indoor');
  });

  it('arrives already due, so Today has something to do on first run', () => {
    const now = new Date();
    expect(isThirsty(plantsSeed(now)[0], now)).toBe(true);
  });

  it('looks lived-in — a history of photographs and notes', () => {
    // The point of one example rather than six is that it shows what a plant looks like
    // after a year of use. An empty one would teach nothing.
    const [plant] = plantsSeed();
    expect(plant.photos.length).toBeGreaterThan(3);
    expect(plant.journal.length).toBeGreaterThan(1);
  });

  it('dates itself relative to now rather than to a frozen calendar', () => {
    const a = plantsSeed(new Date(2026, 0, 15))[0];
    const b = plantsSeed(new Date(2027, 0, 15))[0];
    expect(a.lastWateredISO).not.toBe(b.lastWateredISO);
    expect(a.addedISO).not.toBe(b.addedISO);
  });
});
