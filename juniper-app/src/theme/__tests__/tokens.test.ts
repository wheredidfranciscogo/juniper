/**
 * Guards on the typography tokens — both rules below are Android-fidelity issues that
 * are invisible on iOS, which is exactly why they need a test rather than a memory.
 */

import { fonts, text } from '../tokens';

type Preset = Record<string, unknown>;
const presets = Object.entries(text) as [string, Preset][];

describe('typography tokens', () => {
  it('disables Android font padding on every preset', () => {
    // Android adds padding above and below the glyphs on top of the explicit lineHeight
    // each preset sets, so text sits low and blocks run tall. Ignored on iOS, which is
    // why a missed preset would never show up while developing on a Mac.
    for (const [name, preset] of presets) {
      expect([name, preset.includeFontPadding]).toEqual([name, false]);
    }
  });

  it('never uses fontStyle to fake an italic', () => {
    // A custom fontFamily with `fontStyle: 'italic'` is synthesised on iOS but falls back
    // to the SYSTEM font on Android, so the copy silently renders in Roboto. Italics must
    // name a real loaded face instead.
    for (const [name, preset] of presets) {
      expect([name, preset.fontStyle]).toEqual([name, undefined]);
    }
  });

  it('exposes a real italic face for each family that needs one', () => {
    expect(fonts.serif.regularItalic).toBe('SourceSerif4_400Regular_Italic');
    expect(fonts.sans.regularItalic).toBe('PublicSans_400Regular_Italic');
  });

  it('still carries the handoff values it is meant to', () => {
    // The wrapper must not have flattened anything away.
    expect(text.splashTitle).toMatchObject({ fontSize: 44, lineHeight: 52 });
    expect(text.overline).toMatchObject({ letterSpacing: 2.2, textTransform: 'uppercase' });
  });
});
