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
 */

import { Stack } from 'expo-router';

import { colors } from '../theme';
import { useStore } from './store';

export function RootStack() {
  const { onboarded } = useStore();
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
