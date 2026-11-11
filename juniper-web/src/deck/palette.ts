/**
 * The deck's own dryness ramp: mint → butter → rose.
 *
 * SEPARATE FROM src/lib/ramp.ts ON PURPOSE. That one is the grid app's, it is fixed by
 * D14, and eight tests assert its exact output. This is a different product decision —
 * a brighter, three-stop, card-deck palette — and the honest way to hold two different
 * answers is two functions, not a flag inside one.
 *
 * THREE STOPS, NOT TWO. Two colours can only say "more" or "less". Three can say
 * "fine / soon / now", which is the actual question, and routing the middle through
 * yellow keeps the whole ramp bright instead of sagging into the grey-khaki that the
 * two-stop version passes through at its midpoint.
 *
 * Interpolated in OKLab for the same reason as ramp.ts: the sRGB path between these
 * colours goes somewhere muddy, and the middle is where most of a garden sits most of
 * the time. Converted once from the source hex rather than hand-written, so the ends
 * of the ramp really are those colours.
 */

export interface Oklab {
  l: number;
  a: number;
  b: number;
}

/** #A9D6B0 — just watered. */
export const FRESH: Oklab = { l: 0.8339, a: -0.0607, b: 0.0361 };
/** #F0DCA0 — getting there. */
export const MID: Oklab = { l: 0.8968, a: -0.0025, b: 0.08 };
/** #F3AEB4 — due, and no further. */
export const DUE: Oklab = { l: 0.8173, a: 0.0791, b: 0.0186 };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function mix(a: Oklab, b: Oklab, t: number): Oklab {
  return {
    l: round(a.l + (b.l - a.l) * t),
    a: round(a.a + (b.a - a.a) * t),
    b: round(a.b + (b.b - a.b) * t),
  };
}

/**
 * The colour at `dryness` along the ramp.
 *
 * Clamps rather than throws: this feeds a style attribute on every card of every
 * render, and a garden that renders nothing because one plant has a bad timestamp is a
 * far worse failure than a card that is merely the wrong green.
 *
 * IT HOLDS AT THE DUE END (D12). A plant three days late looks exactly like a plant
 * due today. Nothing escalates, nothing reddens further, nothing accuses.
 */
export function cardAt(dryness: number): Oklab {
  const d = clamp01(dryness);
  return d <= 0.5 ? mix(FRESH, MID, d * 2) : mix(MID, DUE, (d - 0.5) * 2);
}

/** The same thing as a CSS colour, ready for a `background-color`. */
export function cardColor(dryness: number): string {
  const { l, a, b } = cardAt(dryness);
  return `oklab(${l} ${a} ${b})`;
}

/**
 * The window's ground — a deeper, more saturated cousin of the card's own colour.
 *
 * The panel started out as plain card stock, which left the artwork sitting on a white
 * hole punched in a coloured card. The reference decks do the opposite: the artwork sits
 * on a rich ground inside a pale frame. Deriving it from the card colour rather than
 * picking a fixed ink means a fresh plant gets a deep green window and a thirsty one a
 * deep rose, so the card reads as one object in two tones instead of two unrelated
 * halves.
 */
export function panelAt(dryness: number): Oklab {
  const c = cardAt(dryness);
  return { l: round(c.l * 0.46), a: round(c.a * 1.45), b: round(c.b * 1.45) };
}

export function panelColor(dryness: number): string {
  const { l, a, b } = panelAt(dryness);
  return `oklab(${l} ${a} ${b})`;
}

/* ---------------------------------------------------------------------------
 * THE CARD'S COLOUR IS THE PLANT, NOT THE CLOCK.
 *
 * Earlier the whole card sat on the dryness ramp, which meant a garden was one swatch
 * in eight shades and a plant you knew by its colour changed colour as the week went
 * on. Now the card says what KIND of plant it is and never changes; the water state
 * lives entirely in the pixel border (see border.ts). A garden becomes a set of
 * recognisable objects, and the thing that moves is the thing that is actually moving.
 * ------------------------------------------------------------------------- */

import type { PlantIconName } from '../data/types';

/** A creamy pastel per kind of plant. Converted once from hex; see git history. */
const KINDS: Record<PlantIconName, Oklab> = {
  seedling: { l: 0.9027, a: -0.0354, b: 0.0285 }, // #CFE7CB  pale mint
  leaf: { l: 0.9156, a: -0.0048, b: 0.0728 }, //     #F3E3AC  butter
  monstera: { l: 0.8919, a: -0.0168, b: -0.0264 }, // #C9DFEE  sky
  fern: { l: 0.8786, a: 0.0461, b: 0.0037 }, //      #F3CBD3  blush
  cactus: { l: 0.8973, a: 0.0025, b: 0.0369 }, //    #E8DCC2  sand
  flower: { l: 0.875, a: 0.0219, b: -0.0333 }, //    #DBD0EC  lilac
  herb: { l: 0.9125, a: -0.0265, b: 0.0417 }, //     #DCE8C4  pale green
};

const str = ({ l, a, b }: Oklab) => `oklab(${l} ${a} ${b})`;

/** The card's own colour, from the kind of plant it is. */
export function kindColor(kind: PlantIconName): string {
  return str(KINDS[kind] ?? KINDS.leaf);
}

/** The window's ground: the same colour, taken deeper so artwork sits ON something. */
export function kindGround(kind: PlantIconName): string {
  const c = KINDS[kind] ?? KINDS.leaf;
  return str({ l: round(c.l * 0.44), a: round(c.a * 1.5), b: round(c.b * 1.5) });
}

/* ---- the water state, as ink and as pixels ------------------------------- */

/** #3F7A4A — just watered. */
const MARK_FRESH: Oklab = { l: 0.5263, a: -0.0828, b: 0.051 };
/** #B4463C — due. */
const MARK_DUE: Oklab = { l: 0.5411, a: 0.1282, b: 0.0683 };

/** The rank's colour: green when the plant is fine, red when it is thirsty. */
export function markColor(dryness: number): string {
  return str(mix(MARK_FRESH, MARK_DUE, clamp01(dryness)));
}

/**
 * The two families the border squares are drawn from. Several shades each rather than
 * one flat colour, so the ring reads as something built out of pieces.
 */
export const WET_SHADES = ['#6FAE7C', '#86C291', '#5A9A68', '#9BD3A4', '#7CBA88'];
export const DRY_SHADES = ['#C7625A', '#D77B70', '#B14F48', '#E3968C', '#CE6F65'];
