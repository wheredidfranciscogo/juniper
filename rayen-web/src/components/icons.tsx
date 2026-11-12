/**
 * Rayen line-art botanical icons.
 * One-weight stroke, no fills, hand-drawn feel.
 *
 * Path data is identical to the native app's components/icons/index.tsx, which took it
 * from rayen-design/icons.jsx — keep all three in sync. Only the element names change
 * (react-native-svg's <Path> is the web's <path>), and `stroke` inherits from
 * `currentColor` so a square's silhouette can be coloured by CSS rather than by a prop.
 */

import type { ReactNode } from 'react';
import type { PlantIconName } from '../data/types';

export interface IconProps {
  size?: number;
  stroke?: number;
  className?: string;
}

function Base({
  size = 22,
  stroke = 1.5,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconSeedling = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21V11" />
    <path d="M12 11c-3.5 0-6-2-6-5 3.5 0 6 2 6 5z" />
    <path d="M12 13c3 0 5.5-1.8 5.5-4.5-3 0-5.5 1.8-5.5 4.5z" />
    <path d="M7 21h10" />
  </Base>
);

export const IconLeaf = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
    <path d="M5 19c4-4 8-8 14-14" />
  </Base>
);

export const IconMonstera = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21c-1-3-1-6 0-9 1.5-4 5-6 9-6-.5 4-3 7-7 8" />
    <path d="M12 21c-3-1-5-3-6-6" />
    <path d="M14 10l-2 2M16 12l-2 1M18 9l-2 2" />
    <path d="M12 21V13" />
  </Base>
);

export const IconFern = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21V5" />
    <path d="M12 7c-2 0-3.5-1-4-3M12 7c2 0 3.5-1 4-3" />
    <path d="M12 11c-2.5 0-4.5-1.5-5-4M12 11c2.5 0 4.5-1.5 5-4" />
    <path d="M12 15c-3 0-5.5-2-6-5M12 15c3 0 5.5-2 6-5" />
    <path d="M12 19c-3.5 0-6.5-2.5-7-6M12 19c3.5 0 6.5-2.5 7-6" />
  </Base>
);

export const IconCactus = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 21V11a2 2 0 014 0v10" />
    <path d="M10 14h-2a2 2 0 01-2-2v-2a1.5 1.5 0 013 0v2" />
    <path d="M14 16h2a2 2 0 002-2V11a1.5 1.5 0 00-3 0v2" />
    <path d="M7 21h10" />
  </Base>
);

export const IconFlower = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="9" r="2" />
    <path d="M12 7c0-2-1-4-3-4 0 2 1 4 3 4z" />
    <path d="M12 7c0-2 1-4 3-4 0 2-1 4-3 4z" />
    <path d="M10 9c-2 0-4 1-4 3 2 0 4-1 4-3z" />
    <path d="M14 9c2 0 4 1 4 3-2 0-4-1-4-3z" />
    <path d="M11 11c-1 1-2 3-1 5 1-1 2-3 1-5z" />
    <path d="M13 11c1 1 2 3 1 5-1-1-2-3-1-5z" />
    <path d="M12 16v5" />
    <path d="M10 21h4" />
  </Base>
);

export const IconHerb = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21v-8" />
    <path d="M10 13c-2 0-4-1-4-3 2 0 4 1 4 3z" />
    <path d="M14 13c2 0 4-1 4-3-2 0-4 1-4 3z" />
    <path d="M11 9c-1.5 0-3-1-3-2.5 1.5 0 3 1 3 2.5z" />
    <path d="M13 9c1.5 0 3-1 3-2.5-1.5 0-3 1-3 2.5z" />
    <path d="M9 21h6" />
  </Base>
);

/* --- UI --- */

export const IconDrop = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 13l4 4L19 7" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconCamera = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8.5A2 2 0 015 6.5h2l1.2-2h7.6L17 6.5h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
    <circle cx="12" cy="13" r="3.5" />
  </Base>
);

export const PLANT_ICONS: Record<PlantIconName, (p: IconProps) => ReactNode> = {
  seedling: IconSeedling,
  leaf: IconLeaf,
  monstera: IconMonstera,
  fern: IconFern,
  cactus: IconCactus,
  flower: IconFlower,
  herb: IconHerb,
};

/** The icon for a plant, falling back to a leaf rather than to nothing. */
export function PlantIcon({ name, ...rest }: IconProps & { name: PlantIconName }) {
  const Glyph = PLANT_ICONS[name] ?? IconLeaf;
  return <Glyph {...rest} />;
}
