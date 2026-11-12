/**
 * A demo garden, offered on an empty one.
 *
 * THIS USED TO BE THE DECK'S ONLY SOURCE OF PLANTS, held in memory so a design
 * prototype could not write into the garden you actually keep. The deck reads the real
 * store now, so that reason is gone and this has one job left: a garden with nothing in
 * it is a blank screen, and a blank screen teaches you nothing about a deck.
 *
 * These are handed to `addPlant` like any other plant — written, logged, editable,
 * removable. Nothing here is special-cased downstream, which is the point: a demo you
 * cannot edit tells you nothing either. The button is offered only when the garden is
 * empty, so it can never overwrite one you have tended.
 *
 * Eight plants rather than the seed's one, spread evenly along the dryness ramp, because
 * the thing being shown is a STACK and a stack of one proves nothing.
 */

import type { Plant } from '../data/types';

interface Spec {
  id: string;
  name: string;
  species: string;
  icon: Plant['icon'];
  pressing: Plant['pressing'];
  waterEvery: number;
  /** Days since last watered — chosen so the deck covers the whole ramp. */
  since: number;
  light: string;
}

const SPECS: Spec[] = [
  { id: 'marcel', name: 'Marcel', species: 'Monstera deliciosa', icon: 'monstera', pressing: 'moss', waterEvery: 7, since: 9, light: 'Bright, indirect' },
  { id: 'agnes', name: 'Agnes', species: 'Nephrolepis exaltata', icon: 'fern', pressing: 'deep', waterEvery: 4, since: 4, light: 'Shade' },
  { id: 'plum', name: 'Plum', species: 'Pilea peperomioides', icon: 'leaf', pressing: 'default', waterEvery: 6, since: 5, light: 'Bright, indirect' },
  { id: 'bruno', name: 'Bruno', species: 'Zamioculcas zamiifolia', icon: 'leaf', pressing: 'deep', waterEvery: 21, since: 14, light: 'Low' },
  { id: 'soot', name: 'Soot', species: 'Opuntia microdasys', icon: 'cactus', pressing: 'clay', waterEvery: 30, since: 12, light: 'Full sun' },
  { id: 'hazel', name: 'Hazel', species: 'Thymus vulgaris', icon: 'herb', pressing: 'moss', waterEvery: 3, since: 1, light: 'Full sun' },
  { id: 'delphine', name: 'Delphine', species: 'Phalaenopsis amabilis', icon: 'flower', pressing: 'clay', waterEvery: 10, since: 1, light: 'Bright, indirect' },
  { id: 'fig', name: 'Fig', species: 'Ficus lyrata', icon: 'seedling', pressing: 'default', waterEvery: 9, since: 0, light: 'Bright, indirect' },
];

function daysAgo(n: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function demoPlants(now: Date = new Date()): Plant[] {
  return SPECS.map((s) => ({
    id: s.id,
    name: s.name,
    species: s.species,
    pressing: s.pressing,
    icon: s.icon,
    waterEvery: s.waterEvery,
    lastWateredISO: daysAgo(s.since, now),
    light: s.light,
    location: 'indoor' as const,
    addedISO: daysAgo(300, now),
    photos: [],
    journal: [],
  }));
}
