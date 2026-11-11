/**
 * Which photograph stands for a plant.
 *
 * Photos were previously only ever visible on the Plant Detail timeline: the hero, the
 * Today card and the Garden thumbnail all drew the illustrated pressing regardless. So
 * you could photograph a plant and still never see it anywhere the plant appears.
 *
 * The newest photograph with an image IS the plant's picture. No "set as cover" step —
 * `addPlant` and the add-photo action both prepend, so the most recent one wins simply
 * by being first. Taking a better photo replaces the old one, which is the behaviour
 * people expect without being told.
 *
 * Pure, so it can be tested without a device.
 */

import type { Plant } from '../data/types';

/** The plant's picture, or undefined when it has none and the pressing should show. */
export function coverPhotoUri(plant: Pick<Plant, 'photos'>): string | undefined {
  return plant.photos?.find((photo) => typeof photo.uri === 'string' && photo.uri.length > 0)?.uri;
}
