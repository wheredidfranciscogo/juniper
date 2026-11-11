/**
 * Dryness — how far a plant has drifted from "just watered" toward "due".
 *
 * This is the whole information content of the garden grid. Each plant is a square
 * whose colour sits somewhere on a moss → dried ramp, so one glance at the screen
 * reports the state of every plant without a word being read. Watering a plant snaps
 * it back to moss and it drifts out again over its own cadence.
 *
 * Deliberately RN-free and dependency-free, like watering.ts, so it runs under plain
 * node with a fake clock. Every function takes `now` explicitly. The colour ramp lives
 * in the component as two theme tokens and is interpolated by Reanimated — this file
 * deals only in the 0..1 number, because that is the part worth testing.
 *
 * IT HOLDS AT 1. See DECISIONS.md D12. A plant three days late looks exactly like a
 * plant due today: the ramp saturates and stops. Nothing escalates, nothing reddens,
 * nothing accuses. The same rule the reminder copy is already held to by a test —
 * a thirsty plant is just thirsty.
 */

import type { Plant } from '../data/types';
import { daysSinceWatered, daysUntilWater } from './watering';

/** Cadence floor. A plant stored with 0 or a negative cadence would divide by zero. */
const MIN_CADENCE = 1;

export type DrynessStage = 'fresh' | 'drying' | 'due';

/**
 * 0 = watered today, 1 = due (or any amount past due).
 *
 * Derived from `daysSinceWatered`, so it inherits that function's calendar-day
 * arithmetic and cannot be shifted a day by a daylight-saving boundary.
 */
export function dryness(plant: Plant, now: Date): number {
  const cadence = Math.max(MIN_CADENCE, Math.round(plant.waterEvery));
  const elapsed = daysSinceWatered(plant, now);
  if (!Number.isFinite(elapsed)) return 0;
  return clamp01(elapsed / cadence);
}

/**
 * Coarse band, for the things colour cannot carry on its own: the accessibility
 * label, and any future non-visual surface.
 *
 * A grid that encodes its only information as hue is unreadable to a colourblind or
 * screen-reader user, so every tile states its state in words too.
 */
export function drynessStage(plant: Plant, now: Date): DrynessStage {
  const d = dryness(plant, now);
  if (d >= 1) return 'due';
  if (d >= 0.6) return 'drying';
  return 'fresh';
}

/**
 * What the tile says out loud: "Marcel, due today", "Marcel, 3 days to go".
 *
 * Plain and unalarmed even when overdue — "due" rather than "overdue by 9 days",
 * because the grid deliberately does not keep count (D12).
 */
export function drynessLabel(plant: Plant, now: Date): string {
  const remaining = daysUntilWater(plant, now);
  if (remaining <= 0) return `${plant.name}, due for water`;
  if (remaining === 1) return `${plant.name}, due tomorrow`;
  return `${plant.name}, ${remaining} days to go`;
}

/**
 * Sort order for the grid: thirstiest first, so the plants that need you rise to the
 * top-left without the grid ever reshuffling under your thumb mid-session.
 *
 * Ties break on name, not on array order, so the layout is stable across renders and
 * across app launches — a grid whose positions move on their own is unreadable, and
 * position is half of what makes the squares recognisable at a glance.
 */
export function byThirst(a: Plant, b: Plant, now: Date): number {
  const diff = dryness(b, now) - dryness(a, now);
  if (Math.abs(diff) > 1e-9) return diff;
  return a.name.localeCompare(b.name);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
