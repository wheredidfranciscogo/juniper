/**
 * A herbarium pressing — what fills a plant's square until there is a photograph.
 *
 * A tinted panel, a botanical silhouette at low opacity, and the species in italic
 * serif. Ported from the native app's components/Pressing.tsx, which took it from
 * rayen-design/pressing.jsx.
 *
 * It is deliberately not a grey "no image" box. A new garden is mostly pressings, so
 * this is the first thing anyone sees, and it has to look like a choice rather than an
 * absence.
 */

import type { PlantIconName, PressingTone } from '../data/types';
import { PlantIcon } from './icons';

export interface PressingProps {
  species: string;
  icon: PlantIconName;
  tone?: PressingTone;
  /** Bigger silhouette and visible species label. Off inside a small grid square. */
  big?: boolean;
  /**
   * Drop the pressing's own background and draw only the silhouette.
   *
   * Used inside a grid square, where the tile's dryness colour is already filling the
   * space. A pressing with its own tint there is a SECOND colour system competing with
   * the first — a clay-toned plant reads as warm and thirsty however recently it was
   * watered — so in the grid the tone steps aside and the silhouette sits straight on
   * the dryness field. The tone keeps its job on the expanded card, where it is the
   * only colour in the frame.
   */
  bare?: boolean;
}

export function Pressing({
  species,
  icon,
  tone = 'default',
  big = false,
  bare = false,
}: PressingProps) {
  return (
    <div
      className={`pressing${bare ? ' pressing--bare' : ` pressing--${tone}`}${
        big ? ' pressing--big' : ''
      }`}
    >
      <span className="pressing__glyph">
        <PlantIcon name={icon} size={big ? 96 : 40} stroke={big ? 1 : 1.25} />
      </span>
      {big && <span className="pressing__species">{species}</span>}
    </div>
  );
}
