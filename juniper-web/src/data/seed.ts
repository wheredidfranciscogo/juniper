/**
 * The single example plant a fresh install starts with.
 *
 * Not six demo plants and not an empty screen. One plant, deliberately lived-in — a
 * year of photographs, a few journal notes, already a day past due — so a new install
 * shows what Juniper looks like once you have actually been using it, without leaving
 * a fake garden to delete before you can start your own.
 *
 * Marcel is watered-relative-to-now rather than fixed, because the whole app derives
 * thirst from the clock (see src/lib/watering.ts).
 */

import type { Plant } from './types';

/** Local 9am, `n` days before `now`, as an ISO timestamp. */
function daysAgo(n: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/** `n` days before `now` as a plain YYYY-MM-DD date. */
function dateAgo(n: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * A function rather than a constant: the dates are relative, and a module-load constant
 * would freeze them at import time and drift as the process stayed alive.
 */
export function plantsSeed(now: Date = new Date()): Plant[] {
  return [
    {
      id: 'marcel',
      name: 'Marcel',
      species: 'Monstera deliciosa',
      nickname: 'The dramatic one in the living room',
      pressing: 'moss',
      icon: 'monstera',
      waterEvery: 7,
      // A day past due, so Today has something to do the moment you arrive.
      lastWateredISO: daysAgo(8, now),
      light: 'bright indirect',
      location: 'indoor',
      addedISO: dateAgo(332, now),
      photos: [
        { date: dateAgo(20, now), label: 'new leaf opening' },
        { date: dateAgo(96, now), label: '' },
        { date: dateAgo(160, now), label: 'first fenestration' },
        { date: dateAgo(240, now), label: '' },
        { date: dateAgo(332, now), label: 'the day I brought him home' },
      ],
      journal: [
        {
          date: dateAgo(4, now),
          text: "New leaf unfurled overnight. The fenestration is wider than last time — feels like he's settling in.",
        },
        {
          date: dateAgo(96, now),
          text: 'Repotted into the terracotta one. Roots were starting to circle. He seemed unbothered.',
        },
        {
          date: dateAgo(160, now),
          text: 'First proper split-leaf. Caught myself talking to him about it.',
        },
      ],
    },
  ];
}
