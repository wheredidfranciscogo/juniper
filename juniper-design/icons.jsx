// Line-art botanical icons. One weight (1.5px), no fills, hand-drawn feel.
// All inherit currentColor.

const Icon = ({ size = 22, stroke = 1.5, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const IconSeedling = (p) => (
  <Icon {...p}>
    <path d="M12 21V11" />
    <path d="M12 11c-3.5 0-6-2-6-5 3.5 0 6 2 6 5z" />
    <path d="M12 13c3 0 5.5-1.8 5.5-4.5-3 0-5.5 1.8-5.5 4.5z" />
    <path d="M7 21h10" />
  </Icon>
);

const IconLeaf = (p) => (
  <Icon {...p}>
    <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
    <path d="M5 19c4-4 8-8 14-14" />
  </Icon>
);

const IconMonstera = (p) => (
  <Icon {...p}>
    <path d="M12 21c-1-3-1-6 0-9 1.5-4 5-6 9-6-.5 4-3 7-7 8" />
    <path d="M12 21c-3-1-5-3-6-6" />
    <path d="M14 10l-2 2M16 12l-2 1M18 9l-2 2" />
    <path d="M12 21V13" />
  </Icon>
);

const IconWatering = (p) => (
  <Icon {...p}>
    <path d="M4 13v5a2 2 0 002 2h7a2 2 0 002-2v-5" />
    <path d="M4 13h11" />
    <path d="M15 14l5-2v6l-5-2" />
    <path d="M6 13V9a3 3 0 013-3h3v7" />
    <path d="M9 6V4" />
  </Icon>
);

const IconDrop = (p) => (
  <Icon {...p}>
    <path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" />
  </Icon>
);

const IconSun = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Icon>
);

const IconSunPartial = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="3.5" />
    <path d="M12 5v1.5M5 13h1.5M17.5 13H19M7 8l1 1M16 8l-1 1" />
    <path d="M4 18c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 5 0" />
  </Icon>
);

const IconThermometer = (p) => (
  <Icon {...p}>
    <path d="M14 14V5a2 2 0 10-4 0v9a4 4 0 104 0z" />
    <circle cx="12" cy="17" r="1.5" />
  </Icon>
);

const IconCamera = (p) => (
  <Icon {...p}>
    <path d="M3 8h3.5L8 6h8l1.5 2H21v11H3V8z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icon>
);

const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M16 16l4 4" />
  </Icon>
);

const IconPencil = (p) => (
  <Icon {...p}>
    <path d="M4 20h4l11-11-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </Icon>
);

const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

const IconBack = (p) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

const IconHome = (p) => (
  <Icon {...p}>
    <path d="M4 11l8-7 8 7v9H4v-9z" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);

const IconGarden = (p) => (
  <Icon {...p}>
    <path d="M4 20h16" />
    <path d="M8 20c0-4 1-7 4-9 3 2 4 5 4 9" />
    <path d="M12 11c-2-1-3-3-3-5 2 0 4 1 4 3" />
    <path d="M12 11c2-1 3-3 3-5-2 0-4 1-4 3" />
  </Icon>
);

const IconJournal = (p) => (
  <Icon {...p}>
    <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" />
    <path d="M5 17a3 3 0 013-3h11" />
    <path d="M9 8h6M9 11h4" />
  </Icon>
);

const IconBell = (p) => (
  <Icon {...p}>
    <path d="M6 15V11a6 6 0 1112 0v4l2 3H4l2-3z" />
    <path d="M10 21h4" />
  </Icon>
);

const IconClose = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

const IconCheck = (p) => (
  <Icon {...p}>
    <path d="M5 12l5 5 9-11" />
  </Icon>
);

const IconMore = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </Icon>
);

const IconFern = (p) => (
  <Icon {...p}>
    <path d="M12 21V5" />
    <path d="M12 7c-2 0-3.5-1-4-3M12 7c2 0 3.5-1 4-3" />
    <path d="M12 11c-2.5 0-4.5-1.5-5-4M12 11c2.5 0 4.5-1.5 5-4" />
    <path d="M12 15c-3 0-5.5-2-6-5M12 15c3 0 5.5-2 6-5" />
    <path d="M12 19c-3.5 0-6.5-2.5-7-6M12 19c3.5 0 6.5-2.5 7-6" />
  </Icon>
);

const IconCactus = (p) => (
  <Icon {...p}>
    <path d="M10 21V11a2 2 0 014 0v10" />
    <path d="M10 14h-2a2 2 0 01-2-2v-2a1.5 1.5 0 013 0v2" />
    <path d="M14 16h2a2 2 0 002-2V11a1.5 1.5 0 00-3 0v2" />
    <path d="M7 21h10" />
  </Icon>
);

const IconFlower = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="9" r="2" />
    <path d="M12 7c0-2-1-4-3-4 0 2 1 4 3 4z" />
    <path d="M12 7c0-2 1-4 3-4 0 2-1 4-3 4z" />
    <path d="M10 9c-2 0-4 1-4 3 2 0 4-1 4-3z" />
    <path d="M14 9c2 0 4 1 4 3-2 0-4-1-4-3z" />
    <path d="M11 11c-1 1-2 3-1 5 1-1 2-3 1-5z" />
    <path d="M13 11c1 1 2 3 1 5-1-1-2-3-1-5z" />
    <path d="M12 16v5" />
    <path d="M10 21h4" />
  </Icon>
);

const IconHerb = (p) => (
  <Icon {...p}>
    <path d="M12 21v-8" />
    <path d="M10 13c-2 0-4-1-4-3 2 0 4 1 4 3z" />
    <path d="M14 13c2 0 4-1 4-3-2 0-4 1-4 3z" />
    <path d="M11 9c-1.5 0-3-1-3-2.5 1.5 0 3 1 3 2.5z" />
    <path d="M13 9c1.5 0 3-1 3-2.5-1.5 0-3 1-3 2.5z" />
    <path d="M9 21h6" />
  </Icon>
);

const IconWindow = (p) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M12 4v16M4 12h16" />
  </Icon>
);

const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </Icon>
);

const IconHandWater = (p) => (
  <Icon {...p}>
    <path d="M6 11c0-3 2-6 6-6s6 3 6 6" />
    <path d="M9 11c0 4 1 7 3 9 2-2 3-5 3-9" />
    <path d="M4 14c2 0 3-1 3-3M20 14c-2 0-3-1-3-3" />
  </Icon>
);

const IconSparkle = (p) => (
  <Icon {...p}>
    <path d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5L12 4z" />
  </Icon>
);

Object.assign(window, {
  Icon,
  IconSeedling, IconLeaf, IconMonstera, IconWatering, IconDrop,
  IconSun, IconSunPartial, IconThermometer, IconCamera, IconSearch,
  IconPencil, IconPlus, IconBack, IconHome, IconGarden, IconJournal,
  IconBell, IconClose, IconCheck, IconMore, IconFern, IconCactus,
  IconFlower, IconHerb, IconWindow, IconClock, IconHandWater, IconSparkle,
});
