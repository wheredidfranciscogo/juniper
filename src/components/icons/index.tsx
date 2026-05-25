/**
 * Jungle Jungle line-art botanical icons.
 * One-weight stroke, no fills, hand-drawn feel.
 * Ported verbatim from design_handoff_jungle_jungle/icons.jsx — keep paths in sync.
 */

import * as React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export interface IconProps {
  size?: number;
  stroke?: number;
  color?: string;
}

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 22,
  stroke = 1.5,
  color = colors.ink,
  children,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </Svg>
);

export const IconSeedling: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 21V11" />
    <Path d="M12 11c-3.5 0-6-2-6-5 3.5 0 6 2 6 5z" />
    <Path d="M12 13c3 0 5.5-1.8 5.5-4.5-3 0-5.5 1.8-5.5 4.5z" />
    <Path d="M7 21h10" />
  </Base>
);

export const IconLeaf: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
    <Path d="M5 19c4-4 8-8 14-14" />
  </Base>
);

export const IconMonstera: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 21c-1-3-1-6 0-9 1.5-4 5-6 9-6-.5 4-3 7-7 8" />
    <Path d="M12 21c-3-1-5-3-6-6" />
    <Path d="M14 10l-2 2M16 12l-2 1M18 9l-2 2" />
    <Path d="M12 21V13" />
  </Base>
);

export const IconWatering: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M4 13v5a2 2 0 002 2h7a2 2 0 002-2v-5" />
    <Path d="M4 13h11" />
    <Path d="M15 14l5-2v6l-5-2" />
    <Path d="M6 13V9a3 3 0 013-3h3v7" />
    <Path d="M9 6V4" />
  </Base>
);

export const IconDrop: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" />
  </Base>
);

export const IconSun: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="3.5" />
    <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Base>
);

export const IconSunPartial: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Circle cx="12" cy="13" r="3.5" />
    <Path d="M12 5v1.5M5 13h1.5M17.5 13H19M7 8l1 1M16 8l-1 1" />
    <Path d="M4 18c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 5 0" />
  </Base>
);

export const IconThermometer: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M14 14V5a2 2 0 10-4 0v9a4 4 0 104 0z" />
    <Circle cx="12" cy="17" r="1.5" />
  </Base>
);

export const IconCamera: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M3 8h3.5L8 6h8l1.5 2H21v11H3V8z" />
    <Circle cx="12" cy="13.5" r="3.5" />
  </Base>
);

export const IconSearch: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Circle cx="11" cy="11" r="6" />
    <Path d="M16 16l4 4" />
  </Base>
);

export const IconPencil: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M4 20h4l11-11-4-4L4 16v4z" />
    <Path d="M14 6l4 4" />
  </Base>
);

export const IconPlus: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconBack: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M15 5l-7 7 7 7" />
  </Base>
);

export const IconHome: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M4 11l8-7 8 7v9H4v-9z" />
    <Path d="M10 20v-6h4v6" />
  </Base>
);

export const IconGarden: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M4 20h16" />
    <Path d="M8 20c0-4 1-7 4-9 3 2 4 5 4 9" />
    <Path d="M12 11c-2-1-3-3-3-5 2 0 4 1 4 3" />
    <Path d="M12 11c2-1 3-3 3-5-2 0-4 1-4 3" />
  </Base>
);

export const IconJournal: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" />
    <Path d="M5 17a3 3 0 013-3h11" />
    <Path d="M9 8h6M9 11h4" />
  </Base>
);

export const IconBell: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M6 15V11a6 6 0 1112 0v4l2 3H4l2-3z" />
    <Path d="M10 21h4" />
  </Base>
);

export const IconClose: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconCheck: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M5 12l5 5 9-11" />
  </Base>
);

export const IconMore: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Circle cx="6" cy="12" r="1" />
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="18" cy="12" r="1" />
  </Base>
);

export const IconFern: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 21V5" />
    <Path d="M12 7c-2 0-3.5-1-4-3M12 7c2 0 3.5-1 4-3" />
    <Path d="M12 11c-2.5 0-4.5-1.5-5-4M12 11c2.5 0 4.5-1.5 5-4" />
    <Path d="M12 15c-3 0-5.5-2-6-5M12 15c3 0 5.5-2 6-5" />
    <Path d="M12 19c-3.5 0-6.5-2.5-7-6M12 19c3.5 0 6.5-2.5 7-6" />
  </Base>
);

export const IconCactus: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M10 21V11a2 2 0 014 0v10" />
    <Path d="M10 14h-2a2 2 0 01-2-2v-2a1.5 1.5 0 013 0v2" />
    <Path d="M14 16h2a2 2 0 002-2V11a1.5 1.5 0 00-3 0v2" />
    <Path d="M7 21h10" />
  </Base>
);

export const IconFlower: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Circle cx="12" cy="9" r="2" />
    <Path d="M12 7c0-2-1-4-3-4 0 2 1 4 3 4z" />
    <Path d="M12 7c0-2 1-4 3-4 0 2-1 4-3 4z" />
    <Path d="M10 9c-2 0-4 1-4 3 2 0 4-1 4-3z" />
    <Path d="M14 9c2 0 4 1 4 3-2 0-4-1-4-3z" />
    <Path d="M11 11c-1 1-2 3-1 5 1-1 2-3 1-5z" />
    <Path d="M13 11c1 1 2 3 1 5-1-1-2-3-1-5z" />
    <Path d="M12 16v5" />
    <Path d="M10 21h4" />
  </Base>
);

export const IconHerb: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 21v-8" />
    <Path d="M10 13c-2 0-4-1-4-3 2 0 4 1 4 3z" />
    <Path d="M14 13c2 0 4-1 4-3-2 0-4 1-4 3z" />
    <Path d="M11 9c-1.5 0-3-1-3-2.5 1.5 0 3 1 3 2.5z" />
    <Path d="M13 9c1.5 0 3-1 3-2.5-1.5 0-3 1-3 2.5z" />
    <Path d="M9 21h6" />
  </Base>
);

export const IconWindow: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Rect x="4" y="4" width="16" height="16" rx="1" />
    <Path d="M12 4v16M4 12h16" />
  </Base>
);

export const IconClock: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="8" />
    <Path d="M12 8v4l3 2" />
  </Base>
);

export const IconHandWater: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M6 11c0-3 2-6 6-6s6 3 6 6" />
    <Path d="M9 11c0 4 1 7 3 9 2-2 3-5 3-9" />
    <Path d="M4 14c2 0 3-1 3-3M20 14c-2 0-3-1-3-3" />
  </Base>
);

export const IconSparkle: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <Path d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5L12 4z" />
  </Base>
);

/** Lookup for plant pressings (icon picked per plant.icon). */
export const IconByName = {
  seedling: IconSeedling,
  leaf: IconLeaf,
  monstera: IconMonstera,
  fern: IconFern,
  cactus: IconCactus,
  flower: IconFlower,
  herb: IconHerb,
} as const;

export type PlantIconName = keyof typeof IconByName;

/** Broader lookup including UI icons used in onboarding option cards. */
export const AllIcons = {
  ...IconByName,
  sun: IconSun,
  sunPartial: IconSunPartial,
  thermometer: IconThermometer,
  window: IconWindow,
  clock: IconClock,
  watering: IconWatering,
  handWater: IconHandWater,
  drop: IconDrop,
  pencil: IconPencil,
  journal: IconJournal,
  camera: IconCamera,
  search: IconSearch,
  sparkle: IconSparkle,
  plus: IconPlus,
  back: IconBack,
  close: IconClose,
  check: IconCheck,
  more: IconMore,
  bell: IconBell,
  home: IconHome,
  garden: IconGarden,
} as const;

export type IconName = keyof typeof AllIcons;
