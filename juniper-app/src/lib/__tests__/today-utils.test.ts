import { greetingFor, lastWateredLabel } from '../today-utils';

const at = (h: number, m = 0) => new Date(2026, 4, 27, h, m, 0); // Wed 27 May 2026

describe('greetingFor', () => {
  it.each([
    [0, 'Late night'],
    [4, 'Late night'],
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [20, 'Good evening'],
    [21, 'Late night'],
    [23, 'Late night'],
  ])('returns %s at hour %d', (hour, expected) => {
    expect(greetingFor(at(hour as number))).toBe(expected);
  });

  it('defaults to the current time when no date is given', () => {
    jest.useFakeTimers().setSystemTime(at(9));
    try {
      expect(greetingFor()).toBe('Good morning');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('lastWateredLabel', () => {
  // Wednesday 27 May 2026 as the "now" anchor.
  const NOW = at(12);

  it('reports "today" for 0 or future-ish values', () => {
    expect(lastWateredLabel(0, NOW)).toBe('Last watered today.');
    expect(lastWateredLabel(-3, NOW)).toBe('Last watered today.');
  });

  it('reports "yesterday" for 1 day', () => {
    expect(lastWateredLabel(1, NOW)).toBe('Last watered yesterday.');
  });

  it('reports the weekday name between 2 and 6 days', () => {
    // 2 days before Wed 27 May -> Mon 25 May
    expect(lastWateredLabel(2, NOW)).toBe('Last watered Monday.');
    // 3 -> Sunday 24
    expect(lastWateredLabel(3, NOW)).toBe('Last watered Sunday.');
    // 6 -> Thursday 21
    expect(lastWateredLabel(6, NOW)).toBe('Last watered Thursday.');
  });

  it('switches to "N days ago" once a full week has passed', () => {
    expect(lastWateredLabel(7, NOW)).toBe('Last watered 7 days ago.');
    expect(lastWateredLabel(30, NOW)).toBe('Last watered 30 days ago.');
  });

  it('reads the system clock when no anchor is supplied', () => {
    jest.useFakeTimers().setSystemTime(at(12));
    try {
      expect(lastWateredLabel(3)).toBe('Last watered Sunday.');
    } finally {
      jest.useRealTimers();
    }
  });
});
