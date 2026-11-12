import { describe, expect, it } from 'vitest';

import { band, dried, hash, order, shade } from '../border';

describe('the band', () => {
  it('fills the block in reading order', () => {
    const cells = band(3, 2);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual({ x: 0, y: 0 });
    expect(cells[2]).toEqual({ x: 2, y: 0 });
    expect(cells[3]).toEqual({ x: 0, y: 1 });
  });

  it('refuses an empty block', () => {
    expect(band(0, 3)).toEqual([]);
    expect(band(3, 0)).toEqual([]);
  });
});

describe('the pixel border', () => {
  it('dries none at 0 and all at 1', () => {
    expect(dried('agnes', 0, 20).filter(Boolean)).toHaveLength(0);
    expect(dried('agnes', 1, 20).every(Boolean)).toBe(true);
  });

  it('holds at the due end rather than escalating (D12)', () => {
    expect(dried('agnes', 1, 20)).toEqual(dried('agnes', 4, 20));
  });

  it('dries progressively — a square that has gone never comes back', () => {
    const n = 40;
    let prev = dried('marcel', 0, n);
    for (let d = 0.05; d <= 1.0001; d += 0.05) {
      const next = dried('marcel', d, n);
      for (let i = 0; i < n; i += 1) {
        if (prev[i]) expect(next[i]).toBe(true);
      }
      expect(next.filter(Boolean).length).toBeGreaterThanOrEqual(prev.filter(Boolean).length);
      prev = next;
    }
  });

  it('scatters rather than drying in a block', () => {
    // A sweep would dry one contiguous run. Count how many boundaries there are.
    const n = 48;
    const d = dried('agnes', 0.5, n);
    let flips = 0;
    for (let i = 0; i < n; i += 1) if (d[i] !== d[(i + 1) % n]) flips += 1;
    // A clock hand gives 2. A good scatter over 48 cells gives roughly 24.
    expect(flips).toBeGreaterThan(12);
  });

  it('is stable for a plant and different between plants', () => {
    expect(dried('agnes', 0.4, 30)).toEqual(dried('agnes', 0.4, 30));
    expect(dried('agnes', 0.4, 30)).not.toEqual(dried('marcel', 0.4, 30));
    expect(order('agnes', 12)).toEqual(order('agnes', 12));
  });

  it('gives a complete permutation', () => {
    const seq = order('fig', 25);
    expect([...seq].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });

  it('picks a shade in range, repeatably', () => {
    for (let i = 0; i < 50; i += 1) {
      const s = shade('soot', i, 5);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(5);
    }
    expect(shade('soot', 3, 5)).toBe(shade('soot', 3, 5));
  });

  it('hashes without collapsing to one value', () => {
    const seen = new Set(['a', 'b', 'c', 'agnes', 'marcel'].map(hash));
    expect(seen.size).toBe(5);
  });
});

