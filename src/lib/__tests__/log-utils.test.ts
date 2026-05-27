import { groupLabel, timestampLabel, groupLogByDay } from '../log-utils';
import type { LogEntry } from '../../data/types';

// Build an ISO string from local calendar parts. toISOString()/new Date() are
// exact inverses, so the local Y/M/D the functions read back is stable in any TZ.
const iso = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m, d, h, 0, 0).toISOString();

// Wednesday 27 May 2026, midday.
const NOW = new Date(2026, 4, 27, 12, 0, 0);

describe('groupLabel', () => {
  it('labels same-day entries "Today"', () => {
    expect(groupLabel(iso(2026, 4, 27, 8), NOW)).toBe('Today');
  });

  it('treats a future timestamp as Today (diff <= 0)', () => {
    expect(groupLabel(iso(2026, 4, 28, 8), NOW)).toBe('Today');
  });

  it('labels the previous day "Yesterday"', () => {
    expect(groupLabel(iso(2026, 4, 26, 8), NOW)).toBe('Yesterday');
  });

  it('uses the weekday name within the past week', () => {
    // 24 May 2026 is a Sunday, 3 days before NOW.
    expect(groupLabel(iso(2026, 4, 24, 8), NOW)).toBe('Sunday');
  });

  it('uses "N days ago" between 7 and 29 days', () => {
    // 17 May 2026 is 10 days before NOW.
    expect(groupLabel(iso(2026, 4, 17, 8), NOW)).toBe('10 days ago');
  });

  it('falls back to month + year past 30 days', () => {
    // 1 April 2026 is 56 days before NOW.
    expect(groupLabel(iso(2026, 3, 1, 8), NOW)).toBe('April 2026');
  });
});

describe('timestampLabel', () => {
  it('returns "just now" under two minutes', () => {
    const when = new Date(2026, 4, 27, 11, 59).toISOString();
    expect(timestampLabel(when, new Date(2026, 4, 27, 12, 0))).toBe('just now');
  });

  it('returns minutes under an hour', () => {
    const when = new Date(2026, 4, 27, 11, 55).toISOString();
    expect(timestampLabel(when, new Date(2026, 4, 27, 12, 0))).toBe('5m ago');
  });

  it('returns hours under six hours', () => {
    const when = new Date(2026, 4, 27, 9, 0).toISOString();
    expect(timestampLabel(when, new Date(2026, 4, 27, 12, 0))).toBe('3h ago');
  });

  it('returns a clock time past six hours', () => {
    const when = new Date(2026, 4, 27, 2, 30).toISOString();
    expect(timestampLabel(when, new Date(2026, 4, 27, 10, 30))).toBe('02:30');
  });
});

describe('groupLogByDay', () => {
  const entry = (id: string, when: string): LogEntry => ({
    id,
    plantId: 'p',
    kind: 'note',
    text: id,
    when,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns no groups for an empty log', () => {
    expect(groupLogByDay([])).toEqual([]);
  });

  it('merges consecutive entries that share a day label', () => {
    const log = [
      entry('a', iso(2026, 4, 27, 9)),
      entry('b', iso(2026, 4, 27, 8)),
      entry('c', iso(2026, 4, 26, 8)),
    ];
    const groups = groupLogByDay(log);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday']);
    expect(groups[0].entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[1].entries.map((e) => e.id)).toEqual(['c']);
  });

  it('starts a new group when a later entry repeats an earlier label', () => {
    // Not pre-sorted: Today, Yesterday, Today -> three groups, no merge across the gap.
    const log = [
      entry('a', iso(2026, 4, 27, 9)),
      entry('b', iso(2026, 4, 26, 9)),
      entry('c', iso(2026, 4, 27, 7)),
    ];
    expect(groupLogByDay(log).map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Today']);
  });
});
