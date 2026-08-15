/**
 * Keeps the OS notification queue in step with the garden, and routes a tapped
 * reminder to the plant it's about.
 *
 * Two hooks, deliberately separate:
 *   useReminderSync()  — rebuilds the queue whenever a due date could have moved
 *   useReminderTaps()  — deep-links a tapped notification to plant/[id]
 *
 * The sync is debounced through an effect on `plants`, so watering, adding, editing a
 * cadence, or hydrating from storage all converge on one rebuild rather than each
 * poking the scheduler directly. `syncReminders` is idempotent, so an extra call is
 * harmless — a missed one is not.
 */

import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import type { Plant } from '../data/types';
import { syncReminders } from './notifications';

/**
 * Rebuild the pending reminder queue when the garden changes, and again whenever the
 * app comes back to the foreground.
 *
 * The foreground resync matters more than it looks: the queue holds only each plant's
 * *next* reminder, so once one fires it needs replacing. Returning to the app is the
 * reliable moment to do that.
 */
export function useReminderSync(plants: Plant[], hydrated: boolean): void {
  React.useEffect(() => {
    if (!hydrated) return;
    syncReminders(plants).catch(() => {
      // Scheduling is best-effort: a denied permission or an OS limit must never
      // take the app down.
    });
  }, [plants, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') {
        syncReminders(plants).catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [plants, hydrated]);
}

/**
 * Open the plant a reminder is about when it's tapped.
 *
 * Handles both paths: a tap while the app is running (the listener), and a tap that
 * launched the app from cold (getLastNotificationResponseAsync — the listener never
 * fires for that one, which is the classic way deep links silently do nothing on a
 * cold start).
 */
export function useReminderTaps(enabled: boolean): void {
  const router = useRouter();

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const open = (response: Notifications.NotificationResponse | null) => {
      const plantId = response?.notification?.request?.content?.data?.plantId;
      if (typeof plantId === 'string' && plantId.length > 0) {
        router.push(`/plant/${plantId}`);
      }
    };

    // Cold start: the app was launched *by* the notification.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!cancelled) open(response);
      })
      .catch(() => {});

    // Warm: tapped while the app was already running or backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled, router]);
}
