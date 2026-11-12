/**
 * The dryness ramp: a number from 0 to 1 becomes the colour of a square.
 *
 * WHY THIS IS JAVASCRIPT AND NOT CSS. Three CSS formulations were tried on the real
 * thing first, and two of them are quietly broken in Chrome 152:
 *
 *   - `background-color: color-mix(in oklab, var(--dried) calc(var(--dryness) * 100%),
 *     var(--moss-soft))` with `transition: background-color`. The colour resolves once
 *     at first paint and never again. No transition events fire.
 *   - A tall `linear-gradient` slid by `background-position-y`, with a transition on it.
 *     Same freeze: the inline position reads 0%, the computed position stays 100%.
 *
 * Both failed the same way, and both failed SILENTLY — the store updated, the DOM
 * updated, the accessibility label updated, and the square stayed exactly the colour it
 * already was. The native app had its own version of this blind spot: Reanimated is
 * mocked under test and `interpolateColor` returns a constant, so no test there could
 * see a colour either.
 *
 * Interpolating here fixes that twice over. `background-color` set to a concrete colour
 * is the most ordinary transition in CSS and behaves, and the ramp becomes a pure
 * function of one number — which means it is finally something a test can assert.
 *
 * The interpolation is in OKLab, not sRGB. Mixing these two particular colours in RGB
 * drags the middle of the ramp through a muddy khaki, and the middle is where most of a
 * garden sits most of the time.
 */

/** A colour in OKLab: perceptual lightness, green→red, blue→yellow. */
export interface Oklab {
  l: number;
  a: number;
  b: number;
}

/**
 * The ends of the ramp, as OKLab.
 *
 * These are `--moss-soft` (#6B8A6A) and `--dried` (#B8826C) from styles/tokens.css,
 * converted once. Keep them in step with the tokens: this file and that one are the
 * only two places the ramp's colours exist.
 *
 * Held at the same 4 decimal places `rampAt` rounds to, so that the ends of the ramp
 * are exactly these colours rather than almost them. The discarded digits are far below
 * anything a screen can show.
 */
export const FRESH: Oklab = { l: 0.6005, a: -0.048, b: 0.0349 };
export const DUE: Oklab = { l: 0.655, a: 0.0544, b: 0.0509 };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Round to 4 places, so a tile's style attribute doesn't churn on float noise. */
function round(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * The OKLab colour at `dryness` along the ramp.
 *
 * Out-of-range and non-finite inputs clamp rather than throw: this feeds a style
 * attribute on every tile of every render, and a garden that renders nothing because
 * one plant has a bad timestamp would be a much worse failure than a square that is
 * merely the wrong green.
 */
export function rampAt(dryness: number): Oklab {
  const d = clamp01(dryness);
  return {
    l: round(FRESH.l + (DUE.l - FRESH.l) * d),
    a: round(FRESH.a + (DUE.a - FRESH.a) * d),
    b: round(FRESH.b + (DUE.b - FRESH.b) * d),
  };
}

/** The same thing as a CSS colour, ready for a `background-color`. */
export function rampColor(dryness: number): string {
  const { l, a, b } = rampAt(dryness);
  return `oklab(${l} ${a} ${b})`;
}
