/**
 * Juniper — herbarium design tokens.
 * Source of truth: juniper-design/styles.css + README.md.
 * Keep this file aligned with the handoff. No ad-hoc colors elsewhere.
 */

export const colors = {
  // Surfaces
  paper: '#FAF9F5',
  surface: '#F5F2EA',
  surface2: '#EFEBDF',

  // Ink (warm near-black, never #000)
  ink: '#2D2A26',
  inkMuted: '#7A716A',
  inkFaint: '#A89F95',

  // Clay — primary CTA, FAB, watering
  clay: '#CC785C',
  clayDeep: '#B5654A',
  claySoft: '#E8B8A6',

  // Moss — living, watered, success
  moss: '#3F5D3E',
  mossSoft: '#6B8A6A',

  // Dried — thirsty (desaturated, never red/alarming)
  dried: '#B8826C',

  // Lines
  hairline: '#E8E2D5',
  hairlineStrong: '#D9D2C2',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Font *family names* — must match the loaded font asset names in _layout.tsx.
 * Variable weights: we load specific weights from @expo-google-fonts.
 */
export const fonts = {
  serif: {
    regular: 'SourceSerif4_400Regular',
    regularItalic: 'SourceSerif4_400Regular_Italic',
    medium: 'SourceSerif4_500Medium',
    mediumItalic: 'SourceSerif4_500Medium_Italic',
    semibold: 'SourceSerif4_600SemiBold',
    bold: 'SourceSerif4_700Bold',
  },
  sans: {
    light: 'PublicSans_300Light',
    regular: 'PublicSans_400Regular',
    // A real italic face, not `fontStyle: 'italic'`. iOS fakes a slant for a family with
    // no italic; Android falls back to the SYSTEM font entirely, so italic sans copy
    // silently rendered in Roboto. The handoff asks for sans italic by name (the plant
    // nickname), so the face is loaded rather than the design changed.
    regularItalic: 'PublicSans_400Regular_Italic',
    medium: 'PublicSans_500Medium',
    semibold: 'PublicSans_600SemiBold',
    bold: 'PublicSans_700Bold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semibold: 'JetBrainsMono_600SemiBold',
  },
} as const;

/** Border radius scale */
export const radii = {
  sm: 8,
  md: 12, // buttons
  lg: 14, // cards (notes, inline editor)
  xl: 18, // large cards, plant photo frames
  xxl: 24, // modal sheets
  pill: 9999,
} as const;

/** Spacing rhythm — handoff calls out 24px page, 32px section, 16–22px card */
export const spacing = {
  xs: 4,
  sm: 6,
  md: 10,
  base: 16,
  lg: 20,
  xl: 22,
  page: 24,
  section: 32,
} as const;

/**
 * Easing curves — React Native's `Easing.bezier()` consumers should import
 * BEZIER_BASE / BEZIER_LONG and call `Easing.bezier(...args)`.
 * Reanimated worklets can use these tuples directly.
 */
export const BEZIER_BASE = [0.32, 0.72, 0.32, 1] as const;
export const BEZIER_LONG = [0.4, 0, 0.2, 1] as const;

export const duration = {
  fast: 220,
  base: 240,
  medium: 320,
  long: 360,
  fade: 360,
  ripple: 900,
  progress: 500,
  watering: 600,
} as const;

/**
 * Android adds vertical padding above and below every <Text> based on the font's own
 * metrics (`includeFontPadding` defaults to true). Every preset below sets an explicit
 * lineHeight from the handoff, and that padding is added ON TOP of it — so on Android
 * the glyphs sit lower in their box and every text block is taller than drawn. It is
 * the usual reason a design looks right on iOS and subtly wrong on Android.
 *
 * Applied here, once, rather than remembered at ~30 call sites. Ignored on iOS.
 */
const androidTextFix = <T extends Record<string, object>>(presets: T): T =>
  Object.fromEntries(
    Object.entries(presets).map(([key, value]) => [key, { ...value, includeFontPadding: false }]),
  ) as T;

/**
 * Typography presets — keep these in sync with the handoff README screen specs.
 * Use via `tokens.text.h1`, etc. in StyleSheet.create.
 */
export const text = androidTextFix({
  // Display / serif
  splashTitle: { fontFamily: fonts.serif.regular, fontSize: 44, lineHeight: 52, color: colors.ink },
  archetypeTitle: { fontFamily: fonts.serif.mediumItalic, fontSize: 38, lineHeight: 46, color: colors.ink },
  plantHero: { fontFamily: fonts.serif.regular, fontSize: 38, lineHeight: 44, color: colors.ink },
  question: { fontFamily: fonts.serif.regular, fontSize: 30, lineHeight: 38, color: colors.ink },
  greeting: { fontFamily: fonts.serif.regular, fontSize: 28, lineHeight: 36, color: colors.ink },
  sectionTitle: { fontFamily: fonts.serif.regular, fontSize: 28, lineHeight: 34, color: colors.ink },
  cardName: { fontFamily: fonts.serif.regular, fontSize: 22, lineHeight: 28, color: colors.ink },
  rowName: { fontFamily: fonts.serif.regular, fontSize: 19, lineHeight: 24, color: colors.ink },
  blurb: { fontFamily: fonts.serif.regular, fontSize: 17, lineHeight: 24, color: colors.ink },
  noteBody: { fontFamily: fonts.serif.regular, fontSize: 17, lineHeight: 26, color: colors.ink },
  upcomingName: { fontFamily: fonts.serif.regular, fontSize: 17, lineHeight: 22, color: colors.ink },
  footer: { fontFamily: fonts.serif.regularItalic, fontSize: 13, lineHeight: 20, color: colors.inkFaint },
  species: { fontFamily: fonts.serif.regularItalic, fontSize: 14, lineHeight: 18, color: colors.inkMuted },
  speciesLg: { fontFamily: fonts.serif.regularItalic, fontSize: 18, lineHeight: 24, color: colors.inkMuted },

  // UI / sans
  body: { fontFamily: fonts.sans.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodyMuted: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  hint: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  cardHint: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  optionLabel: { fontFamily: fonts.sans.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  button: { fontFamily: fonts.sans.medium, fontSize: 15, lineHeight: 18, color: colors.paper, letterSpacing: 0.15 },
  ghostButton: { fontFamily: fonts.sans.medium, fontSize: 15, lineHeight: 18, color: colors.ink },
  tabLabel: { fontFamily: fonts.sans.regular, fontSize: 11, lineHeight: 14, color: colors.inkFaint, letterSpacing: 0.22 },
  lastWatered: { fontFamily: fonts.sans.regular, fontSize: 12, lineHeight: 16, color: colors.inkMuted },

  // Mono — overlines, dates, counters
  overline: { fontFamily: fonts.mono.regular, fontSize: 10, lineHeight: 14, color: colors.inkFaint, letterSpacing: 2.2, textTransform: 'uppercase' as const },
  overlineSm: { fontFamily: fonts.mono.regular, fontSize: 9, lineHeight: 12, color: colors.inkFaint, letterSpacing: 1.8, textTransform: 'uppercase' as const },
  overlineMd: { fontFamily: fonts.mono.regular, fontSize: 11, lineHeight: 14, color: colors.inkFaint, letterSpacing: 1.76, textTransform: 'uppercase' as const },
  monoCaption: { fontFamily: fonts.mono.regular, fontSize: 11, lineHeight: 14, color: colors.inkMuted, letterSpacing: 1.32 },
  monoTimestamp: { fontFamily: fonts.mono.regular, fontSize: 11, lineHeight: 14, color: colors.inkMuted },
  pill: { fontFamily: fonts.mono.medium, fontSize: 9, lineHeight: 12, letterSpacing: 1.8, textTransform: 'uppercase' as const },
} as const);
