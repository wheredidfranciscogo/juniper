import { describe, expect, it } from 'vitest';

import { DUE, FRESH, MID, cardAt, cardColor, panelAt, panelColor } from '../palette';

describe('the deck palette', () => {
  it('starts at mint and ends at rose', () => {
    expect(cardAt(0)).toEqual(FRESH);
    expect(cardAt(1)).toEqual(DUE);
  });

  it('passes through butter at the midpoint', () => {
    expect(cardAt(0.5)).toEqual(MID);
  });

  it('holds at the due end rather than escalating past it (D12)', () => {
    expect(cardAt(1)).toEqual(cardAt(1.6));
    expect(cardAt(1)).toEqual(cardAt(99));
  });

  it('clamps a nonsense dryness to fresh rather than throwing', () => {
    expect(cardAt(-3)).toEqual(FRESH);
    expect(cardAt(Number.NaN)).toEqual(FRESH);
    expect(cardAt(Number.POSITIVE_INFINITY)).toEqual(FRESH);
  });

  it('never doubles back: the warm axis climbs the whole way', () => {
    const warm = Array.from({ length: 21 }, (_, i) => cardAt(i / 20).a);
    expect([...warm].sort((x, y) => x - y)).toEqual(warm);
  });

  it('gives the window a darker, warmer-or-cooler ground than the card', () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) {
      const card = cardAt(d);
      const panel = panelAt(d);
      expect(panel.l).toBeLessThan(card.l);
      // Deeper, not greyer: the colour axes must not collapse toward zero.
      expect(Math.abs(panel.a)).toBeGreaterThanOrEqual(Math.abs(card.a));
      expect(Math.abs(panel.b)).toBeGreaterThanOrEqual(Math.abs(card.b));
    }
  });

  it('keeps the window legible against the card at both ends', () => {
    expect(panelColor(0)).not.toBe(cardColor(0));
    expect(panelColor(1)).not.toBe(cardColor(1));
  });

  it('renders an oklab() string a browser can parse', () => {
    expect(cardColor(0)).toBe(`oklab(${FRESH.l} ${FRESH.a} ${FRESH.b})`);
    expect(cardColor(0.25)).toMatch(/^oklab\(-?\d*\.?\d+ -?\d*\.?\d+ -?\d*\.?\d+\)$/);
  });
});
