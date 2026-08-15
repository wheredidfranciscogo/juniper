/**
 * Watering reminders — scheduled and fired ENTIRELY ON-DEVICE.
 *
 * These are local notifications, not push: there is no token, no server, and nothing
 * is ever told which plants you own or when you water them. That keeps the promise in
 * DECISIONS.md D2 literally true, and it means reminders work with the phone in
 * aeroplane mode.
 *
 * STRATEGY
 * One pending notification per plant — the next one only. Queueing further ahead would
 * be guesswork, because watering a plant moves every subsequent date. Instead the whole
 * queue is cheap to rebuild, and `syncReminders` is idempotent (cancel everything,
 * recompute from the current garden), so it can safely be called on every event that
 * could change a due date: app focus, watering, adding a plant, editing a cadence, or
 * changing the reminder time.
 *
 * The decision of *what* to schedule lives in ./watering.ts, which is pure and
 * node-testable. This file only talks to the OS.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Plant } from '../data/types';
import { buildReminderQueue } from './watering';

const PREF_KEY = '@juniper/reminders';
export const DEFAULT_TIME = '09:00';
const CHANNEL_ID = 'watering';

export interface ReminderPref {
  enabled: boolean;
  /** "HH:MM", local time. */
  time: string;
}

const DEFAULT_PREF: ReminderPref = { enabled: false, time: DEFAULT_TIME };

// Show the banner even when the app is foregrounded — a reminder you only see if the
// app is closed is a reminder you miss.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Android requires an explicit channel; without one, notifications are silently dropped. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Watering reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    // No custom sound and no vibration pattern: the app is calm, the reminders match.
    sound: undefined,
  });
}

export async function getReminderPref(): Promise<ReminderPref> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREF;
    const parsed = JSON.parse(raw) as Partial<ReminderPref>;
    return {
      enabled: parsed.enabled === true,
      time: typeof parsed.time === 'string' ? parsed.time : DEFAULT_TIME,
    };
  } catch {
    return DEFAULT_PREF;
  }
}

async function writeReminderPref(pref: ReminderPref): Promise<void> {
  try {
    await AsyncStorage.setItem(PREF_KEY, JSON.stringify(pref));
  } catch {
    // Preference is best-effort; a failed write just means the default next launch.
  }
}

/**
 * Ask for notification permission. No-op if already granted.
 *
 * Called post-onboarding, never at launch — a permission prompt on a cold first screen
 * gets denied, and iOS only lets you ask once.
 */
export async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export async function hasPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/**
 * Rebuild the pending queue from scratch: cancel everything, then schedule the next
 * reminder for each plant. Safe to call as often as you like.
 */
export async function syncReminders(plants: Plant[], now: Date = new Date()): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const pref = await getReminderPref();
  if (!pref.enabled || plants.length === 0) return 0;
  if (!(await hasPermission())) return 0;

  await ensureAndroidChannel();

  const queue = buildReminderQueue(plants, { time: pref.time, now });

  for (const slot of queue) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: slot.title,
        body: slot.body,
        // Consumed by the notification-response listener to deep-link to the plant.
        data: { plantId: slot.plantId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: slot.fireAt,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }

  return queue.length;
}

/**
 * Turn reminders on or off, and optionally set the time. Requests permission when
 * enabling; returns false if it was denied so the UI can point at Settings instead of
 * silently pretending reminders are on.
 */
export async function setReminder(
  enabled: boolean,
  opts: { time?: string; plants: Plant[] },
): Promise<boolean> {
  if (enabled && !(await requestPermission())) return false;

  const current = await getReminderPref();
  const next: ReminderPref = { enabled, time: opts.time ?? current.time };
  await writeReminderPref(next);
  await syncReminders(opts.plants);
  return true;
}

/** Cancel everything — used when the garden empties or reminders are turned off. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
