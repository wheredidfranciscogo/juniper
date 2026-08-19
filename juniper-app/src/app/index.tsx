/**
 * Splash screen.
 * Full-bleed paper. Centred seedling icon + serif wordmark + subtitle.
 * Tiny mono "EST. MMXXVI" overline at top, faint "tap anywhere to begin" at bottom.
 * The entire screen is the tap target (no button) — per the handoff.
 */

import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, spacing, text } from '../theme';
import { IconSeedling } from '../components/icons';

export default function Splash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => router.push('/(onboarding)')}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <Text style={[styles.overline, { top: insets.top + 24 }]}>EST. MMXXVI</Text>

      <View style={styles.center}>
        <IconSeedling size={56} stroke={1.3} color={colors.moss} />
        <View style={styles.gap} />
        <Text style={[styles.title, styles.titleItalic]}>Juniper</Text>
        <Text style={styles.subtitle}>A quiet place for your plants.</Text>
      </View>

      <Text style={[styles.foot, { bottom: insets.bottom + 32 }]}>tap anywhere to begin</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
  },
  pressed: { opacity: 0.92 },
  center: { alignItems: 'center' },
  gap: { height: 28 },
  overline: { ...text.overlineSm, position: 'absolute' },
  title: { ...text.splashTitle, textAlign: 'center' },
  titleItalic: { fontFamily: fonts.serif.regularItalic },
  subtitle: { ...text.bodyMuted, marginTop: 12, textAlign: 'center' },
  foot: { ...text.hint, color: colors.inkFaint, position: 'absolute', fontFamily: fonts.sans.regularItalic },
});
