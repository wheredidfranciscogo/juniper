/**
 * Haptics — one place, because the correct call differs by platform.
 *
 * The SDK 54 docs are explicit about this: `impactAsync` and `notificationAsync` are
 * *simulated* on Android through the `Vibrator` system service, and the docs say that
 * API "is not recommended for implementing haptics feedback". The Android-native path
 * is `performAndroidHapticsAsync`, which has no iOS equivalent. So the choice is made
 * here rather than at each call site.
 *
 * Every call swallows its own failure. A phone with haptics disabled, a simulator, or
 * web must never turn a tap that waters a plant into an unhandled rejection.
 *
 * https://docs.expo.dev/versions/v54.0.0/sdk/haptics/
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Watering a plant from the grid — a small act that completed.
 *
 * Deliberately lighter than the hero WaterButton's selection haptic on Plant Detail:
 * from the grid this is a quick confirm you might do three times in a row, not a
 * ceremony.
 */
export function waterTap(): void {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(() => {});
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Opening or closing a plant. Barely there — it marks a change of focus, nothing more. */
export function focusTap(): void {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click).catch(() => {});
    return;
  }
  Haptics.selectionAsync().catch(() => {});
}
