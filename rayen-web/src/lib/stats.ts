/**
 * Garden statistics for the You screen.
 *
 * Pure and RN-free, like watering.ts, so it can be tested against a fake clock.
 *
 * Everything here is DERIVED. `tendedDays` used to be a stored number on Plant and had
 * the same defect as the old `daysSinceWater`: nothing ever incremented it, so a plant
 * read "TENDED FOR 247 DAYS" forever, and the seed's stored values had already drifted
 * out of step with their own `addedISO`. Counting from the join date instead means the
 * number is right by construction.
 */

import type { Plant } from '../data/types';
import { daysBetween } from './watering';
import { isThirsty } from './watering';

/** Whole days since the plant joined. 0 on the day it was added. */
export function tendedDays(plant: Plant, now: Date): number {
  const added = new Date(plant.addedISO);
  if (Number.isNaN(added.getTime())) return 0;
  return Math.max(0, daysBetween(added, now));
}

export interface GardenStats {
  plantCount: number;
  thirstyCount: number;
  /** The plant you've kept alive longest. Null for an empty garden. */
  longest: { name: string; days: number } | null;
  /** Sum of every plant's tended days — the handoff's "plant-days". */
  plantDays: number;
}

export function gardenStats(plants: Plant[], now: Date): GardenStats {
  let longest: GardenStats['longest'] = null;
  let plantDays = 0;

  for (const plant of plants) {
    const days = tendedDays(plant, now);
    plantDays += days;
    if (!longest || days > longest.days) longest = { name: plant.name, days };
  }

  return {
    plantCount: plants.length,
    thirstyCount: plants.filter((p) => isThirsty(p, now)).length,
    longest,
    plantDays,
  };
}

/** "1,204" — thousands separated, for the plant-days counter. */
export function formatCount(n: number): string {
  return n.toLocaleString('en-GB');
}

/**
 * Days as a human phrase: "312 days" up to a year, then "1 year, 2 months".
 * Kept deliberately loose — the point is a sense of duration, not precision.
 */
export function durationLabel(days: number): string {
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  if (days < 365) return `${days} days`;

  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const y = `${years} year${years === 1 ? '' : 's'}`;
  if (months === 0) return y;
  return `${y}, ${months} month${months === 1 ? '' : 's'}`;
}
