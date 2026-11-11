import { describe, expect, it } from 'vitest';

import { archRing, dried, hash, order, ring, shade } from '../border';

describe('the pixel border', () => {
  it('walks the perimeter once, with no cell repeated', () => {
    const cells = ring(4, 5);
    expect(cells).toHaveLength(2 * 4 + 2 * 5 - 4);
    const seen = new Set(cells.map((c) => `${c.x},${c.y}`));
    expect(seen.size).toBe(cells.length);
    // Nothing in the interior.
    expect(cells.every((c) => c.x === 0 || c.y === 0 || c.x === 3 || c.y === 4)).toBe(true);
  });

  it('starts at the top-left and goes clockwise', () => {
    const cells = ring(3, 3);
    expect(cells[0]).toEqual({ x: 0, y: 0 });
    expect(cells[1]).toEqual({ x: 1, y: 0 });
    expect(cells[3]).toEqual({ x: 2, y: 1 });
  });

  it('refuses to build a ring that has no inside', () => {
    expect(ring(1, 5)).toEqual([]);
    expect(ring(0, 0)).toEqual([]);
  });

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

  it('scatters rather than sweeping around the ring', () => {
    // A clock hand would dry a contiguous run. Count how many boundaries there are.
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

describe('the arch outline', () => {
  const size = 40;
  const cells = archRing(size);
  const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;
  const set = new Set(cells.map(key));

  it('produces a closed outline of some substance', () => {
    expect(cells.length).toBeGreaterThan(size * 2);
    expect(new Set(cells.map(key)).size).toBe(cells.length);
  });

  it('is symmetric about the vertical axis', () => {
    for (const c of cells) {
      expect(set.has(`${size - 1 - c.x},${c.y}`)).toBe(true);
    }
  });

  it('keeps every cell inside the square', () => {
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(size);
      expect(c.y).toBeLessThan(size);
    }
  });

  it('reaches the foot on both sides and domes at the top', () => {
    const bottom = cells.filter((c) => c.y === size - 1);
    expect(bottom.length).toBeGreaterThan(size / 2);
    // The topmost row of the outline is narrow — that is the crown of the dome.
    const top = Math.min(...cells.map((c) => c.y));
    const crown = cells.filter((c) => c.y === top);
    expect(crown.length).toBeLessThan(size / 2);
    expect(top).toBe(0);
  });

  it('hollows out: nothing in the middle of the arch is on the outline', () => {
    expect(set.has(`${Math.floor(size / 2)},${Math.floor(size / 2)}`)).toBe(false);
  });

  it('refuses a grid too small to have an inside', () => {
    expect(archRing(2)).toEqual([]);
  });

  it('is deterministic', () => {
    expect(archRing(size)).toEqual(archRing(size));
  });
});
