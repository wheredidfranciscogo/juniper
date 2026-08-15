import type { Plant } from '../../data/types';
import {
  atTimeOnDay,
  buildReminderQueue,
  daysBetween,
  daysSinceWatered,
  daysUntilWater,
  isThirsty,
  nextWateringDate,
  startOfDay,
} from '../watering';

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'p1',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: '2026-08-01T09:00:00.000Z',
  light: 'bright indirect',
  temp: 'warm',
  tendedDays: 100,
  addedISO: '2025-09-17',
  photos: [],
  journal: [],
  ...over,
});

/** Local-time date literal, so the tests don't drift with the runner's timezone. */
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

describe('daysBetween', () => {
  it('counts whole calendar days forward and backward', () => {
    expect(daysBetween(local(2026, 8, 1), local(2026, 8, 8))).toBe(7);
    expect(daysBetween(local(2026, 8, 8), local(2026, 8, 1))).toBe(-7);
    expect(daysBetween(local(2026, 8, 1), local(2026, 8, 1))).toBe(0);
  });

  it('ignores time of day', () => {
    expect(daysBetween(local(2026, 8, 1, 23, 59), local(2026, 8, 2, 0, 1))).toBe(1);
    expect(daysBetween(local(2026, 8, 1, 0, 1), local(2026, 8, 1, 23, 59))).toBe(0);
  });

  it('stays correct across a daylight-saving boundary', () => {
    // Australian DST ends on the first Sunday of April — that local day is 25 hours long.
    // Dividing a millisecond delta by 86.4e6 would round this to 6 days and let a plant
    // slip a day late; calendar arithmetic must not.
    expect(daysBetween(local(2026, 4, 1), local(2026, 4, 8))).toBe(7);
    expect(daysBetween(local(2026, 10, 1), local(2026, 10, 8))).toBe(7);
  });

  it('crosses month and year boundaries', () => {
    expect(daysBetween(local(2026, 12, 28), local(2027, 1, 4))).toBe(7);
  });
});

describe('startOfDay / atTimeOnDay', () => {
  it('zeroes the time', () => {
    expect(startOfDay(local(2026, 8, 1, 17, 42)).getHours()).toBe(0);
  });

  it('applies HH:MM in local time', () => {
    const at = atTimeOnDay(local(2026, 8, 1, 17, 42), '09:30');
    expect(at.getHours()).toBe(9);
    expect(at.getMinutes()).toBe(30);
    expect(at.getDate()).toBe(1);
  });

  it('falls back to 09:00 on unparseable input', () => {
    const at = atTimeOnDay(local(2026, 8, 1), 'nonsense');
    expect(at.getHours()).toBe(9);
    expect(at.getMinutes()).toBe(0);
  });
});

describe('daysSinceWatered', () => {
  it('counts calendar days since the timestamp', () => {
    const p = plant({ lastWateredISO: local(2026, 8, 1, 9).toISOString() });
    expect(daysSinceWatered(p, local(2026, 8, 9, 10))).toBe(8);
  });

  it('is 0 on the day it was watered', () => {
    const p = plant({ lastWateredISO: local(2026, 8, 9, 9).toISOString() });
    expect(daysSinceWatered(p, local(2026, 8, 9, 22))).toBe(0);
  });

  it('never goes negative on a future timestamp', () => {
    const p = plant({ lastWateredISO: local(2026, 9, 1).toISOString() });
    expect(daysSinceWatered(p, local(2026, 8, 1))).toBe(0);
  });

  it('treats an unparseable timestamp as watered today rather than throwing', () => {
    expect(daysSinceWatered(plant({ lastWateredISO: 'not-a-date' }), local(2026, 8, 9))).toBe(0);
  });
});

describe('isThirsty / daysUntilWater', () => {
  const p = plant({ waterEvery: 7, lastWateredISO: local(2026, 8, 1, 9).toISOString() });

  it('is not thirsty before the cadence elapses', () => {
    expect(isThirsty(p, local(2026, 8, 7, 12))).toBe(false);
    expect(daysUntilWater(p, local(2026, 8, 7, 12))).toBe(1);
  });

  it('becomes thirsty exactly on the cadence day', () => {
    expect(isThirsty(p, local(2026, 8, 8, 12))).toBe(true);
    expect(daysUntilWater(p, local(2026, 8, 8, 12))).toBe(0);
  });

  it('reports overdue as a negative countdown', () => {
    expect(daysUntilWater(p, local(2026, 8, 11, 12))).toBe(-3);
  });

  it('treats a zero or negative cadence as daily rather than looping forever', () => {
    const odd = plant({ waterEvery: 0, lastWateredISO: local(2026, 8, 1).toISOString() });
    expect(nextWateringDate(odd, local(2026, 8, 1)).getDate()).toBe(2);
  });
});

describe('the regression that broke the whole loop', () => {
  it('lets a plant become thirsty again after being watered', () => {
    // The old model stored `daysSinceWater` and set it to 0 on watering; nothing ever
    // incremented it, so a plant watered once stayed "not thirsty" forever and could
    // never generate a second reminder.
    const watered = plant({ waterEvery: 7, lastWateredISO: local(2026, 8, 9, 9).toISOString() });
    expect(isThirsty(watered, local(2026, 8, 9))).toBe(false);
    expect(isThirsty(watered, local(2026, 8, 16))).toBe(true);
  });
});

describe('buildReminderQueue', () => {
  const now = local(2026, 8, 9, 12); // midday

  it('schedules one reminder per plant at the chosen time on its due day', () => {
    const p = plant({ id: 'a', waterEvery: 7, lastWateredISO: local(2026, 8, 8, 9).toISOString() });
    const [slot] = buildReminderQueue([p], { time: '09:00', now });

    expect(slot.plantId).toBe('a');
    expect(slot.fireAt.getDate()).toBe(15);
    expect(slot.fireAt.getHours()).toBe(9);
    expect(slot.body).toContain('Marcel');
  });

  it('schedules an overdue plant for the next slot instead of dropping it', () => {
    const overdue = plant({ waterEvery: 3, lastWateredISO: local(2026, 8, 1, 9).toISOString() });
    const [slot] = buildReminderQueue([overdue], { time: '09:00', now });

    // 09:00 today has already passed at midday, so it rolls to tomorrow.
    expect(slot.fireAt.getDate()).toBe(10);
    expect(slot.fireAt.getHours()).toBe(9);
  });

  it('uses today when the reminder time is still ahead', () => {
    const overdue = plant({ waterEvery: 3, lastWateredISO: local(2026, 8, 1, 9).toISOString() });
    const [slot] = buildReminderQueue([overdue], { time: '20:00', now });
    expect(slot.fireAt.getDate()).toBe(9);
    expect(slot.fireAt.getHours()).toBe(20);
  });

  it('never schedules in the past', () => {
    const plants = [
      plant({ id: 'a', waterEvery: 1, lastWateredISO: local(2026, 7, 1).toISOString() }),
      plant({ id: 'b', waterEvery: 30, lastWateredISO: local(2026, 8, 8).toISOString() }),
    ];
    for (const slot of buildReminderQueue(plants, { time: '09:00', now })) {
      expect(slot.fireAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('returns slots sorted soonest first', () => {
    const plants = [
      plant({ id: 'far', waterEvery: 20, lastWateredISO: local(2026, 8, 9).toISOString() }),
      plant({ id: 'near', waterEvery: 2, lastWateredISO: local(2026, 8, 9).toISOString() }),
    ];
    const q = buildReminderQueue(plants, { time: '09:00', now });
    expect(q.map((s) => s.plantId)).toEqual(['near', 'far']);
  });

  it('drops plants due beyond the horizon', () => {
    const p = plant({ waterEvery: 60, lastWateredISO: local(2026, 8, 9).toISOString() });
    expect(buildReminderQueue([p], { time: '09:00', now, horizonDays: 30 })).toHaveLength(0);
  });

  it('caps the queue so iOS never drops notifications silently', () => {
    // iOS keeps only the first 64 pending notifications per app; going over means
    // arbitrary ones are discarded without an error.
    const many = Array.from({ length: 100 }, (_, i) =>
      plant({ id: `p${i}`, waterEvery: 2, lastWateredISO: local(2026, 8, 9).toISOString() }),
    );
    expect(buildReminderQueue(many, { time: '09:00', now, max: 60 })).toHaveLength(60);
  });

  it('returns nothing for an empty garden', () => {
    expect(buildReminderQueue([], { time: '09:00', now })).toEqual([]);
  });

  it('never scolds — no streaks, no counts of missed days', () => {
    const overdue = plant({ waterEvery: 1, lastWateredISO: local(2026, 6, 1).toISOString() });
    const [slot] = buildReminderQueue([overdue], { time: '09:00', now });
    expect(slot.body).not.toMatch(/missed|overdue|forgot|neglect|days? ago|streak/i);
  });
});
