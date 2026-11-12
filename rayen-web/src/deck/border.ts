/**
 * The border of pixels that reports how thirsty a plant is.
 *
 * THE CARD'S OWN COLOUR NO LONGER CARRIES THE WATER STATE. It says what kind of plant
 * this is and never changes, so a garden reads as a set of distinct, recognisable
 * objects rather than a single swatch that happens to be a different shade today. The
 * passage of time lives entirely in the ring of squares around the edge: green when
 * freshly watered, turning red a square at a time until a plant that is due has a ring
 * of nothing but red.
 *
 * THE SQUARES TURN IN A SCATTERED ORDER, not around the ring like a clock hand. A
 * sweeping arc reads as a countdown and invites you to work out exactly how late you
 * are; a dithered spread reads as something drying out, which is what is happening.
 * The order is derived from the plant's id, so it is the same every render and every
 * reload — a ring that reshuffled on each paint would shimmer.
 *
 * Pure and DOM-free, like the rest of src/lib, so the ring can be tested without a
 * browser.
 */

export interface Cell {
  /** Column and row in a `cols` x `rows` grid, zero-based. */
  x: number;
  y: number;
}

/**
 * A block of cells, `cols` by `rows`, in reading order.
 *
 * THIS IS A STRIP ACROSS THE TOP OF THE CARD, and the placement is the whole idea.
 * When a deck is fanned you can see almost nothing of the cards underneath — measured
 * on the real thing, buried cards were showing between 1 and 9 pixels, because the
 * scale applied with depth cancelled out the offset. A ring around the whole card
 * therefore spent three quarters of itself where nothing could ever see it, and an
 * outline around the window spent all of it.
 *
 * A strip along the top edge is the one part of a buried card that is exposed, so it
 * is the only place a state can be read without dealing the card. The fan was widened
 * to match (see restingStyle in DeckCard).
 */
export function band(cols: number, rows: number): Cell[] {
  if (cols < 1 || rows < 1) return [];
  const cells: Cell[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) cells.push({ x, y });
  }
  return cells;
}

/**
 * A small, stable string hash. Not cryptographic — just repeatable and well mixed.
 *
 * THE FINAL AVALANCHE IS NOT DECORATION. Plain FNV-1a over strings that differ only in
 * their last character leaves the ordering dominated by that character, so sorting
 * "agnes:0" .. "agnes:47" by hash produced 10,11,12,...,19,1,0,3,2 — near-sequential.
 * The ring then dried in solid blocks instead of scattering, which is exactly the
 * sweeping clock hand this is meant to avoid. The murmur3 finaliser spreads a
 * one-character difference across all 32 bits.
 */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * The order the squares dry out in: a permutation of 0..n-1, fixed per plant.
 */
export function order(seed: string, n: number): number[] {
  return Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`),
  );
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * Which of the `n` squares have dried, as a boolean per ring index.
 *
 * At dryness 0 none have; at 1 all have, and it goes no further — a plant three days
 * late looks exactly like a plant due today (D12).
 */
export function dried(seed: string, dryness: number, n: number): boolean[] {
  const out = new Array<boolean>(n).fill(false);
  const count = Math.round(clamp01(dryness) * n);
  const seq = order(seed, n);
  for (let i = 0; i < count; i += 1) out[seq[i]] = true;
  return out;
}

/**
 * Which shade from its family each square uses — a few greens and a few reds rather
 * than one flat colour, so the ring reads as something made of pieces.
 */
export function shade(seed: string, index: number, shades: number): number {
  return hash(`${seed}#${index}`) % shades;
}
