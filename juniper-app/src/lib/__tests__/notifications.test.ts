/**
 * Tests for the OS-facing reminder layer. The scheduling *decisions* live in
 * watering.ts and are tested there against a fake clock; what matters here is the
 * gating — that we never schedule when reminders are off or permission is missing,
 * and that every sync starts by clearing the previous queue.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Plant } from '../../data/types';
import {
  DEFAULT_TIME,
  getReminderPref,
  setReminder,
  syncReminders,
} from '../notifications';

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'p1',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  light: 'bright indirect',
  addedISO: '2025-09-17',
  photos: [],
  journal: [],
  ...over,
});

const enabledPref = JSON.stringify({ enabled: true, time: '09:00' });

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  mockNotifications.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as never);
  mockNotifications.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
});

describe('getReminderPref', () => {
  it('defaults to off at 09:00 when nothing is stored', async () => {
    await expect(getReminderPref()).resolves.toEqual({ enabled: false, time: DEFAULT_TIME });
  });

  it('falls back to the default rather than throwing on a corrupt pref', async () => {
    mockStorage.getItem.mockResolvedValueOnce('{{{ not json');
    await expect(getReminderPref()).resolves.toEqual({ enabled: false, time: DEFAULT_TIME });
  });

  it('coerces a malformed stored shape into something usable', async () => {
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify({ enabled: 'yes', time: 42 }));
    await expect(getReminderPref()).resolves.toEqual({ enabled: false, time: DEFAULT_TIME });
  });
});

describe('syncReminders', () => {
  it('always clears the previous queue first, so it is safe to call repeatedly', async () => {
    await syncReminders([plant()]);
    expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('schedules nothing while reminders are off', async () => {
    await expect(syncReminders([plant()])).resolves.toBe(0);
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing when permission is missing, even if the pref says on', async () => {
    mockStorage.getItem.mockResolvedValue(enabledPref);
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as never);

    await expect(syncReminders([plant()])).resolves.toBe(0);
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing for an empty garden', async () => {
    mockStorage.getItem.mockResolvedValue(enabledPref);
    await expect(syncReminders([])).resolves.toBe(0);
  });

  it('schedules one reminder per plant when enabled and permitted', async () => {
    mockStorage.getItem.mockResolvedValue(enabledPref);
    const count = await syncReminders([plant({ id: 'a' }), plant({ id: 'b', name: 'Sage' })]);

    expect(count).toBe(2);
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('attaches the plant id so a tap can deep-link', async () => {
    mockStorage.getItem.mockResolvedValue(enabledPref);
    await syncReminders([plant({ id: 'marcel' })]);

    const [arg] = mockNotifications.scheduleNotificationAsync.mock.calls[0];
    expect(arg.content.data).toEqual({ plantId: 'marcel' });
    expect(arg.content.body).toContain('Marcel');
  });
});

describe('setReminder', () => {
  it('persists the preference and rebuilds the queue when enabling', async () => {
    const ok = await setReminder(true, { time: '18:30', plants: [plant()] });

    expect(ok).toBe(true);
    const [key, value] = mockStorage.setItem.mock.calls[0];
    expect(key).toBe('@juniper/reminders');
    expect(JSON.parse(value)).toEqual({ enabled: true, time: '18:30' });
    expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('reports failure without saving when permission is denied', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as never);
    mockNotifications.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);

    // Returning false lets the UI point at Settings instead of showing a toggle that
    // claims reminders are on while nothing will ever fire.
    await expect(setReminder(true, { plants: [plant()] })).resolves.toBe(false);
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('keeps the existing time when only toggling off', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify({ enabled: true, time: '07:15' }));
    await setReminder(false, { plants: [plant()] });

    const [, value] = mockStorage.setItem.mock.calls[0];
    expect(JSON.parse(value)).toEqual({ enabled: false, time: '07:15' });
  });

  it('does not ask for permission when turning reminders off', async () => {
    await setReminder(false, { plants: [] });
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
