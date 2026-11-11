/**
 * The first tests in this project's history that assert the actual colour of a square.
 *
 * Neither the native app nor the first web attempt could have one: Reanimated is mocked
 * to a plain View under Jest and `interpolateColor` returns a constant, and the CSS
 * versions of the ramp put the whole calculation inside the browser's style engine,
 * where it then silently stopped working. Pulling the interpolation into a pure
 * function is what makes the ramp checkable at all.
 */

import { DUE, FRESH, rampAt, rampColor } from '../ramp';

describe('rampAt', () => {
  it('is the fresh colour at 0 and the due colour at 1', () => {
    expect(rampAt(0)).toEqual(FRESH);
    expect(rampAt(1)).toEqual(DUE);
  });

  it('moves monotonically from green to red across the ramp', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((d) => rampAt(d).a);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
    // Fresh is on the green side of neutral, due is on the red side.
    expect(rampAt(0).a).toBeLessThan(0);
    expect(rampAt(1).a).toBeGreaterThan(0);
  });

  it('puts the halfway colour halfway, not at one end', () => {
    const mid = rampAt(0.5);
    expect(mid.l).toBeCloseTo((FRESH.l + DUE.l) / 2, 4);
    expect(mid.a).toBeCloseTo((FRESH.a + DUE.a) / 2, 4);
    // Interpolating in OKLab rather than sRGB is the whole point of this module: the
    // midpoint is near-neutral in a/b rather than the muddy khaki sRGB produces.
    expect(Math.abs(mid.a)).toBeLessThan(0.01);
  });

  // The ramp saturating is the decision this whole design rests on (D12): a plant three
  // days late must look exactly like a plant due today.
  it('clamps past the due end, so lateness is never rendered', () => {
    expect(rampAt(1.5)).toEqual(DUE);
    expect(rampAt(40)).toEqual(DUE);
  });

  it('clamps below the fresh end', () => {
    expect(rampAt(-3)).toEqual(FRESH);
  });

  it('treats a non-finite dryness as freshly watered rather than throwing', () => {
    // This feeds a style attribute on every tile of every render. Better a wrong green
    // than a garden that will not paint.
    expect(rampAt(Number.NaN)).toEqual(FRESH);
    expect(rampAt(Number.POSITIVE_INFINITY)).toEqual(FRESH);
  });
});

describe('rampColor', () => {
  it('is a CSS oklab() colour', () => {
    expect(rampColor(0)).toBe('oklab(0.6005 -0.048 0.0349)');
    expect(rampColor(1)).toBe('oklab(0.655 0.0544 0.0509)');
  });

  it('rounds, so a tile style does not churn on float noise', () => {
    expect(rampColor(1 / 3)).toMatch(/^oklab\((0|[01]\.\d{1,4}) -?\d?\.?\d{0,4} -?\d?\.?\d{0,4}\)$/);
  });
});
