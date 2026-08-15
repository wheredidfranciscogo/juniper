/**
 * Seed data ported from juniper-design/data.jsx.
 * Demo garden used to populate a new install so the app isn't empty on first run.
 * Not a stand-in for a backend — there isn't one (DECISIONS.md D2).
 */

import type { ArchetypeKey, Archetype, OnboardingAnswers, OnboardingStep, Plant } from './types';

/** Local midnight `n` days before `now`, as an ISO timestamp. */
function daysAgo(n: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/**
 * The demo garden, built relative to `now` so Marcel, Juniper and Sage are already
 * past due the moment onboarding finishes and Today has something to show.
 *
 * This is a function rather than a constant because the seeded watering dates are
 * relative: a module-load constant would freeze them at import time and slowly drift
 * as the process stayed alive.
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
    lastWateredISO: daysAgo(8, now),
    light: 'bright indirect',
    temp: 'warm',
    addedISO: '2025-09-17',
    photos: [
      { date: '2026-05-18', label: 'new leaf opening' },
      { date: '2026-04-22', label: '' },
      { date: '2026-03-09', label: 'first fenestration' },
      { date: '2026-02-01', label: '' },
      { date: '2025-12-14', label: '' },
      { date: '2025-09-17', label: 'the day I brought him home' },
    ],
    journal: [
      { date: 'Tuesday', text: "New leaf unfurled overnight. The fenestration is wider than last time — feels like he's settling in." },
      { date: 'April 22', text: 'Repotted into the terracotta one. Roots were starting to circle. He seemed unbothered.' },
      { date: 'March 9', text: 'First proper split-leaf. Caught myself talking to him about it.' },
    ],
  },
  {
    id: 'juniper',
    name: 'Juniper',
    species: 'Ficus lyrata',
    nickname: 'Tall one by the window',
    pressing: 'clay',
    icon: 'leaf',
    waterEvery: 10,
    lastWateredISO: daysAgo(11, now),
    light: 'bright direct',
    temp: 'warm',
    addedISO: '2025-04-04',
    photos: [
      { date: '2026-05-10', label: '' },
      { date: '2026-04-01', label: 'spring growth' },
      { date: '2026-02-15', label: '' },
      { date: '2025-11-20', label: '' },
    ],
    journal: [
      { date: 'May 10', text: "Two new leaves at the top. She's reaching for the window again." },
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    species: 'Sansevieria trifasciata',
    pressing: 'moss',
    icon: 'herb',
    waterEvery: 21,
    lastWateredISO: daysAgo(12, now),
    light: 'tolerates low',
    temp: 'any',
    addedISO: '2025-11-04',
    photos: [{ date: '2026-04-30', label: '' }],
    journal: [],
  },
  {
    id: 'olive',
    name: 'Olive',
    species: 'Olea europaea',
    nickname: 'Patio, half-shade',
    pressing: 'clay',
    icon: 'leaf',
    waterEvery: 5,
    lastWateredISO: daysAgo(3, now),
    light: 'full sun',
    temp: 'warm',
    addedISO: '2026-02-20',
    photos: [{ date: '2026-05-01', label: '' }],
    journal: [],
  },
  {
    id: 'pip',
    name: 'Pip',
    species: 'Pilea peperomioides',
    nickname: 'The pancake one',
    pressing: 'moss',
    icon: 'flower',
    waterEvery: 6,
    lastWateredISO: daysAgo(4, now),
    light: 'bright indirect',
    temp: 'warm',
    addedISO: '2026-01-08',
    photos: [{ date: '2026-05-15', label: 'pup' }],
    journal: [],
  },
  {
    id: 'atlas',
    name: 'Atlas',
    species: 'Strelitzia nicolai',
    nickname: 'Bedroom corner',
    pressing: 'deep',
    icon: 'fern',
    waterEvery: 9,
    lastWateredISO: daysAgo(6, now),
    light: 'bright indirect',
    temp: 'warm',
    addedISO: '2025-07-10',
    photos: [{ date: '2026-04-19', label: '' }],
    journal: [],
  },
  ];
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  whisperer: {
    name: 'The Plant Whisperer',
    blurb: 'You sense what your plants need before they tell you.',
    body: 'You read the light in a room before you read the label. Plants follow you home and stay.',
  },
  collector: {
    name: 'The Quiet Collector',
    blurb: 'One of each, and then one more.',
    body: 'You keep an eye out for the rare cultivar. Your shelves are an archive in slow motion.',
  },
  forager: {
    name: 'The Forager',
    blurb: 'You bring the outside in.',
    body: 'Herbs by the kitchen, cuttings on the sill. You like a plant you can taste.',
  },
  steady: {
    name: 'The Steady Hand',
    blurb: 'Tuesdays and Saturdays, watering can in hand.',
    body: 'You believe in routine. Your plants reward you for it.',
  },
};

export const ONBOARDING: OnboardingStep[] = [
  {
    key: 'kind',
    question: 'What kind of plants do you tend to?',
    options: [
      { v: 'house', label: 'Houseplants', hint: 'Leafy, indoor, year-round', icon: 'monstera' },
      { v: 'herbs', label: 'Herbs & edibles', hint: 'Basil, mint, tomatoes', icon: 'herb' },
      { v: 'succ', label: 'Succulents & cacti', hint: 'Slow, forgiving', icon: 'cactus' },
      { v: 'mix', label: 'A bit of everything', hint: 'A small jungle', icon: 'fern' },
    ],
  },
  {
    key: 'light',
    question: 'How does your home receive light?',
    options: [
      { v: 'bright', label: 'Bright most of the day', hint: 'South or west windows', icon: 'sun' },
      { v: 'dappled', label: 'Dappled and shifting', hint: 'East-facing, a tree outside', icon: 'sunPartial' },
      { v: 'dim', label: 'On the dim side', hint: 'North-facing or basement', icon: 'window' },
      { v: 'mixed', label: 'A mix, room to room', hint: 'I move things around', icon: 'window' },
    ],
  },
  {
    key: 'time',
    question: 'How much time can you give them?',
    options: [
      { v: 'lots', label: 'A whole afternoon, gladly', hint: 'Repotting is meditative', icon: 'handWater' },
      { v: 'some', label: 'Twenty minutes a week', hint: 'Watering, a tidy up', icon: 'watering' },
      { v: 'little', label: 'Only what they need', hint: 'I want them to thrive without fuss', icon: 'clock' },
    ],
  },
  {
    key: 'draw',
    question: 'What draws you to plants?',
    options: [
      { v: 'calm', label: 'The calm of caring for something', hint: '', icon: 'leaf' },
      { v: 'beauty', label: 'How a room feels with them in it', hint: '', icon: 'flower' },
      { v: 'craft', label: 'The craft — propagating, pruning', hint: '', icon: 'pencil' },
      { v: 'memory', label: 'A grandparent, a garden, a memory', hint: '', icon: 'journal' },
    ],
  },
  {
    key: 'history',
    question: 'Where have you tended plants before?',
    options: [
      { v: 'always', label: 'Always — I grew up around them', hint: '', icon: 'seedling' },
      { v: 'recent', label: 'Recently, and I want to do it well', hint: '', icon: 'sparkle' },
      { v: 'lost', label: "I've lost a few. I'd like to learn.", hint: '', icon: 'drop' },
      { v: 'first', label: 'My first plant is on the way', hint: '', icon: 'seedling' },
    ],
  },
];

export function pickArchetype(answers: OnboardingAnswers): ArchetypeKey {
  if (answers.kind === 'herbs') return 'forager';
  if (answers.draw === 'craft' || answers.history === 'always') return 'whisperer';
  if (answers.time === 'lots' && answers.draw === 'calm') return 'steady';
  if (answers.kind === 'mix') return 'collector';
  return 'whisperer';
}
