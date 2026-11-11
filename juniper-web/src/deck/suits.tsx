/**
 * The deck's suits: one solid silhouette per kind of plant.
 *
 * WHY THESE ARE NOT THE LINE-ART ICONS. components/icons.tsx holds one-weight stroked
 * drawings, shared verbatim with the native app and juniper-design, and they are right
 * where they are. They are wrong on a card. A stroked drawing at 14px — the size of a
 * suit in a corner — is a 1.5px line enclosing a 2px gap, and it silts up into a blob;
 * every real suit on every real card is a solid shape for exactly that reason. Clubs and
 * spades survive being tiny because they have no interior to lose.
 *
 * So the deck gets its own set, drawn as fills on the same 24x24 grid. The line art
 * stays untouched, which also means the three copies of it stay in sync.
 *
 * THE SUIT IS A CATEGORY, NOT A NAME. There are seven of these and a garden has no
 * limit, so two plants will share a mark and that is fine — it says what KIND of thing
 * this is, the way a suit says a card is a heart and the rank says which one. The
 * plant's name and its photograph do the identifying.
 *
 * Drawn to read at both ends: about 14px in a corner and about 60px in the window. That
 * rules out thin stems, interior detail and anything that depends on a gap staying open.
 */

import type { PlantIconName } from '../data/types';

export interface SuitProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function Base({ size = 24, className, style, children }: SuitProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A sprout on a soil line: two cotyledons, one higher, the way a seedling actually comes up. */
export const SuitSeedling = (p: SuitProps) => (
  <Base {...p}>
    <path d="M11.1 10.8h1.8v8.4h-1.8z" />
    <rect x="7" y="18.6" width="10" height="1.9" rx="0.95" />
    <path d="M13 11.6c0-3.4 2.4-5.9 6-6.3.4 3.6-2 6.3-6 6.3z" />
    <path d="M11 13.6c-3.6 0-6-2.4-6-5.6 3.6.2 6 2.4 6 5.6z" />
  </Base>
);

/**
 * One leaf. No midrib.
 *
 * The first cut notched the rib out of the fill and the result read as a quill — an
 * interior line is exactly what a silhouette cannot carry.
 */
export const SuitLeaf = (p: SuitProps) => (
  <Base {...p}>
    <path d="M20.2 3.4c-10 0-16.6 6.6-16.6 16.2 0 .5.4.9.9.9C14.1 20.5 21 13.7 21 4.3c0-.5-.4-.9-.8-.9z" />
  </Base>
);

/**
 * Monstera: lobes fanned from the stem, not a disc with holes punched in it.
 *
 * The first cut used fillRule to subtract slots from a circle. Subpaths inside a shape
 * become holes, not notches open to the rim, and the leftover bridges rendered as a
 * crosshair. Overlapping lobes merge into one body while leaving the gaps between their
 * tips — which is what a split leaf actually looks like.
 */
export const SuitMonstera = (p: SuitProps) => (
  <Base {...p}>
    <path d="M11.3 12h1.4v8.6h-1.4z" />
    <g>
      <ellipse cx="12" cy="7.4" rx="2.1" ry="5.1" />
      <ellipse cx="12" cy="7.4" rx="2.1" ry="5.1" transform="rotate(34 12 13)" />
      <ellipse cx="12" cy="7.4" rx="2.1" ry="5.1" transform="rotate(-34 12 13)" />
      <ellipse cx="12" cy="9.2" rx="1.9" ry="4.3" transform="rotate(68 12 13)" />
      <ellipse cx="12" cy="9.2" rx="1.9" ry="4.3" transform="rotate(-68 12 13)" />
    </g>
  </Base>
);

/** A frond: central rib with pinnae stepping down in pairs. */
export const SuitFern = (p: SuitProps) => (
  <Base {...p}>
    <path d="M11.2 3.5h1.6v17h-1.6z" />
    <path d="M11.2 6.4c-2.3-.2-3.8-1.3-4.4-3.3 2.4.1 3.9 1.1 4.4 3.3zM12.8 6.4c2.3-.2 3.8-1.3 4.4-3.3-2.4.1-3.9 1.1-4.4 3.3z" />
    <path d="M11.2 10.4c-2.8-.2-4.6-1.6-5.3-4.1 2.9.1 4.7 1.4 5.3 4.1zM12.8 10.4c2.8-.2 4.6-1.6 5.3-4.1-2.9.1-4.7 1.4-5.3 4.1z" />
    <path d="M11.2 14.6c-3.2-.2-5.2-1.8-6-4.7 3.3.2 5.3 1.7 6 4.7zM12.8 14.6c3.2-.2 5.2-1.8 6-4.7-3.3.2-5.3 1.7-6 4.7z" />
    <path d="M11.2 18.6c-3.5-.2-5.7-2-6.6-5.2 3.6.2 5.8 1.9 6.6 5.2zM12.8 18.6c3.5-.2 5.7-2 6.6-5.2-3.6.2-5.8 1.9-6.6 5.2z" />
  </Base>
);

/** A column with two arms, on a pot line. Thick arms, or it reads as a trident. */
export const SuitCactus = (p: SuitProps) => (
  <Base {...p}>
    <rect x="9.2" y="4.6" width="5.6" height="15" rx="2.8" />
    <path d="M9.8 8.2v4.6H7.9a3.6 3.6 0 01-3.6-3.6V7.5a2.2 2.2 0 014.4 0v.7z" />
    <path d="M14.2 10.4V15h1.9a3.6 3.6 0 003.6-3.6V9.7a2.2 2.2 0 00-4.4 0v.7z" />
    <rect x="6.6" y="19.2" width="10.8" height="1.9" rx="0.95" />
  </Base>
);

/** Six petals round a centre, on a stem — a bloom, read at a glance. */
export const SuitFlower = (p: SuitProps) => (
  <Base {...p}>
    <path d="M11.2 13.6h1.6V20h-1.6z" />
    <rect x="9" y="19.4" width="6" height="1.7" rx="0.85" />
    <g>
      <ellipse cx="12" cy="4.9" rx="2.3" ry="3.1" />
      <ellipse cx="12" cy="13.1" rx="2.3" ry="3.1" />
      <ellipse cx="8.5" cy="6.9" rx="2.3" ry="3.1" transform="rotate(-60 8.5 6.9)" />
      <ellipse cx="15.5" cy="6.9" rx="2.3" ry="3.1" transform="rotate(60 15.5 6.9)" />
      <ellipse cx="8.5" cy="11.1" rx="2.3" ry="3.1" transform="rotate(60 8.5 11.1)" />
      <ellipse cx="15.5" cy="11.1" rx="2.3" ry="3.1" transform="rotate(-60 15.5 11.1)" />
    </g>
    <circle cx="12" cy="9" r="2.4" fill="var(--suit-eye, #fff)" />
  </Base>
);

/** A sprig: paired leaves up a short stem. */
export const SuitHerb = (p: SuitProps) => (
  <Base {...p}>
    <path d="M11.2 9h1.6v11.4h-1.6z" />
    <rect x="8.4" y="19.6" width="7.2" height="1.8" rx="0.9" />
    <path d="M11 14c-2.9 0-4.9-1.5-5.3-4.2 3 0 5 1.5 5.3 4.2zM13 14c2.9 0 4.9-1.5 5.3-4.2-3 0-5 1.5-5.3 4.2z" />
    <path d="M11.2 9.4c-2.2 0-3.8-1.2-4.1-3.3 2.3 0 3.9 1.2 4.1 3.3zM12.8 9.4c2.2 0 3.8-1.2 4.1-3.3-2.3 0-3.9 1.2-4.1 3.3z" />
    <path d="M11.4 5.6c-1.4-.2-2.3-1-2.5-2.5 1.5.1 2.4.9 2.5 2.5zM12.6 5.6c1.4-.2 2.3-1 2.5-2.5-1.5.1-2.4.9-2.5 2.5z" />
  </Base>
);

export const SUITS: Record<PlantIconName, (p: SuitProps) => React.ReactNode> = {
  seedling: SuitSeedling,
  leaf: SuitLeaf,
  monstera: SuitMonstera,
  fern: SuitFern,
  cactus: SuitCactus,
  flower: SuitFlower,
  herb: SuitHerb,
};

/** The suit for a plant, falling back to a leaf rather than to nothing. */
export function Suit({ name, ...rest }: SuitProps & { name: PlantIconName }) {
  const Glyph = SUITS[name] ?? SuitLeaf;
  return <Glyph {...rest} />;
}
