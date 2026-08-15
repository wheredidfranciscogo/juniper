/**
 * Root navigation skeleton. Lives in src/lib so it can be unit-tested
 * without booting fonts, splash, or gesture-handler from the app/_layout
 * default export. The app's _layout re-exports the default RootLayout
 * that wraps this in those providers.
 *
 * Stack.Protected is the canonical expo-router gate: when `onboarded`
 * flips, the navigator's screen set changes and React Navigation
 * reconciles the active route — no imperative cross-stack router calls
 * required.
 *
 * Renders nothing until the store has hydrated from AsyncStorage so the
 * user doesn't see a flash of the onboarding flow before persisted state
 * loads. The native splash stays visible during this window.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { colors } from '../theme';
import { useStore } from './store';
import { useReminderSync, useReminderTaps } from './use-reminders';

export function RootStack() {
  const { onboarded, hydrated, plants } = useStore();

  // Keep the OS reminder queue in step with the garden, and route taps to the plant.
  // Taps are only wired once onboarded, so a notification can never drop someone into
  // a plant screen behind the onboarding gate.
  useReminderSync(plants, hydrated);
  useReminderTaps(hydrated && onboarded);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plant/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
