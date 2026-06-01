import { useEffect } from 'react';
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
import { StoreProvider } from '../lib/store';
import { RootStack } from '../lib/root-stack';

// Keep the splash screen visible while we load fonts. Fail-soft if it errors.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
