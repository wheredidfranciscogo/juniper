/**
 * Watering maths — when a plant was last watered, when it's next due, and what to
 * put in the reminder queue.
 *
 * Deliberately RN-free and dependency-free so it runs under plain node in tests with
 * a fake clock. Every function takes `now` explicitly; nothing here reads the wall
 * clock on its own. That is what makes a small test suite worth trusting.
 *
 * WHY THIS FILE EXISTS
 * Plants used to carry a stored `daysSinceWater: number`. Nothing ever incremented it —
 * `waterPlant` set it to 0 and it stayed 0 forever, so a plant watered once could never
 * become thirsty again. The app looked correct only because the seed data shipped
 * pre-aged. Time is now derived from an absolute `lastWateredISO` instead of stored as
 * a counter, which is the only shape a reminder can actually be scheduled from.
 */

import type { Plant } from '../data/types';

/** Local midnight for the given instant. Cadence is counted in calendar days. */
export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Whole calendar days from `a` to `b`, ignoring time of day.
 *
 * Uses calendar arithmetic rather than dividing a millisecond difference by 86.4e6,
 * because that is wrong across daylight-saving boundaries: a 23- or 25-hour day would
 * otherwise round a plant into or out of being thirsty a day early.
 */
export function daysBetween(a: Date, b: Date): number {
  const from = startOfDay(a);
  const to = startOfDay(b);
  let days = 0;
  const cursor = new Date(from);
  const forward = to >= from;
  while (startOfDay(cursor).getTime() !== to.getTime()) {
    cursor.setDate(cursor.getDate() + (forward ? 1 : -1));
    days += forward ? 1 : -1;
    // Guard against a pathological loop if either side is an Invalid Date.
    if (Math.abs(days) > 4000) return forward ? 4000 : -4000;
  }
  return days;
}

/** Calendar days since the plant was last watered. Never negative. */
export function daysSinceWatered(plant: Plant, now: Date): number {
  const last = new Date(plant.lastWateredISO);
  if (Number.isNaN(last.getTime())) return 0;
  return Math.max(0, daysBetween(last, now));
}

/**
 * The calendar day the plant becomes due — last watered + its cadence.
 * Returns local midnight of that day; the reminder time is applied separately.
 */
export function nextWateringDate(plant: Plant, now: Date): Date {
  const last = new Date(plant.lastWateredISO);
  const base = Number.isNaN(last.getTime()) ? now : last;
  const due = startOfDay(base);
  due.setDate(due.getDate() + Math.max(1, Math.round(plant.waterEvery)));
  return due;
}

/** True once the plant has gone at least its cadence without water. */
export function isThirsty(plant: Plant, now: Date): boolean {
  return daysSinceWatered(plant, now) >= plant.waterEvery;
}

/** Days until due. 0 means due today; negative means overdue by that many days. */
export function daysUntilWater(plant: Plant, now: Date): number {
  return daysBetween(now, nextWateringDate(plant, now));
}

// ---------------------------------------------------------------------------
// Reminder queue
// ---------------------------------------------------------------------------

export interface ReminderSlot {
  plantId: string;
  plantName: string;
  /** Local instant the notification should fire. Always strictly after `now`. */
  fireAt: Date;
  title: string;
  body: string;
}

export interface QueueOptions {
  /** "HH:MM" local time reminders fire at. */
  time: string;
  now: Date;
  /** Don't schedule further out than this. */
  horizonDays?: number;
  /** Hard cap. iOS allows 64 pending notifications per app; stay under it. */
  max?: number;
}

/**
 * Warm, rotating copy. Never a scold — no streaks, no "you missed", no count of
 * neglected days. A thirsty plant is just thirsty (DECISIONS.md D7).
 */
const COPY = [
  (name: string) => `${name} could use a drink.`,
  (name: string) => `${name} is ready for water.`,
  (name: string) => `Time to water ${name}.`,
  (name: string) => `${name} would like a little water.`,
];

/** Apply "HH:MM" to a given calendar day, in local time. */
export function atTimeOnDay(day: Date, time: string): Date {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const out = startOfDay(day);
  out.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return out;
}

/**
 * Build the full set of notifications that should be pending right now.
 *
 * One reminder per plant — the next one only. Queueing further ahead would be
 * guesswork, because watering a plant moves every subsequent date; the queue is
 * rebuilt on every relevant event instead (see notifications.ts).
 *
 * A plant that is already overdue is scheduled for the next reminder slot rather
 * than being skipped, so re-opening the app re-arms a gentle nudge instead of going
 * silent on the plant that most needs attention.
 */
export function buildReminderQueue(plants: Plant[], opts: QueueOptions): ReminderSlot[] {
  const { time, now, horizonDays = 30, max = 60 } = opts;

  const horizon = startOfDay(now);
  horizon.setDate(horizon.getDate() + horizonDays);

  const slots: ReminderSlot[] = [];

  plants.forEach((plant, i) => {
    let fireAt = atTimeOnDay(nextWateringDate(plant, now), time);

    // Due in the past (or earlier today): use the next slot that hasn't happened yet.
    if (fireAt.getTime() <= now.getTime()) {
      const todaySlot = atTimeOnDay(now, time);
      fireAt =
        todaySlot.getTime() > now.getTime()
          ? todaySlot
          : atTimeOnDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), time);
    }

    if (fireAt.getTime() > horizon.getTime()) return;

    slots.push({
      plantId: plant.id,
      plantName: plant.name,
      fireAt,
      title: 'Juniper',
      body: COPY[i % COPY.length](plant.name),
    });
  });

  return slots.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, max);
}
