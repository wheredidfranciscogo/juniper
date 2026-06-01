import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts as useSourceSerif,
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_500Medium,
  SourceSerif4_500Medium_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import {
  useFonts as usePublicSans,
  PublicSans_300Light,
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import {
  useFonts as useJetBrains,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';

import { colors } from '../theme';
import { StoreProvider, useStore } from '../lib/store';

// Keep the splash screen visible while we load fonts. Fail-soft if it errors.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Inner stack — split because Stack.Protected guards need to read
 * `useStore().onboarded`, which means they must be inside <StoreProvider>.
 * Protected is the canonical expo-router pattern for onboarding gates:
 * when `onboarded` flips, the router removes (onboarding) from the
 * available routes and exposes (tabs), so completeOnboarding only has
 * to set the flag — the navigator does the routing.
 */
function RootStack() {
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

export default function RootLayout() {
  const [serifLoaded, serifError] = useSourceSerif({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_500Medium,
    SourceSerif4_500Medium_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  const [sansLoaded, sansError] = usePublicSans({
    PublicSans_300Light,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  const [monoLoaded, monoError] = useJetBrains({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  const ready = (serifLoaded || serifError) && (sansLoaded || sansError) && (monoLoaded || monoError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <StoreProvider>
        <StatusBar style="dark" />
        <RootStack />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
