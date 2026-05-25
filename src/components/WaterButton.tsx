/**
 * WaterButton — the signature interaction.
 *
 * On tap:
 *   1. 60×60 moss circle scales 0 → 3.2× over 900ms, fading 0.55 → 0.
 *   2. Button background crossfades clay → moss over 600ms.
 *   3. "Water [name]" label fades out over 320ms.
 *   4. "Watered, [day]" label fades in over 320ms with a 220ms delay.
 *   5. Selection haptic fires on tap.
 *
 * Watered state can be controlled externally (so this component is idempotent).
 */

import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { BEZIER_LONG, colors, fonts, radii, text } from '../theme';
import { IconCheck, IconDrop } from './icons';

const LONG_EASE = Easing.bezier(BEZIER_LONG[0], BEZIER_LONG[1], BEZIER_LONG[2], BEZIER_LONG[3]);
const RIPPLE_SIZE = 60;

export interface WaterButtonProps {
  /** Plant name, used in the idle label "Water Marcel". */
  name: string;
  /** Currently watered? Drives the background colour + label. */
  watered: boolean;
  /** Optional label suffix used in the watered state. Defaults to a generic day. */
  wateredLabel?: string;
  /** Called once when the user taps Water. Caller mutates `watered` upstream. */
  onWater: () => void;
}

export function WaterButton({ name, watered, wateredLabel, onWater }: WaterButtonProps) {
  // bg: 0 = clay, 1 = moss. Initialised to match `watered` so re-mounts are stable.
  const bg = useSharedValue(watered ? 1 : 0);
  // label: 0 = idle ("Water X"), 1 = done ("Watered, Tuesday.")
  const label = useSharedValue(watered ? 1 : 0);
  // ripple: 0 → 1 over 900ms each tap.
  const ripple = useSharedValue(0);

  // External `watered` prop changes (e.g., reset, navigation back) sync the animations.
  React.useEffect(() => {
    bg.value = withTiming(watered ? 1 : 0, { duration: 600, easing: LONG_EASE });
    label.value = withTiming(watered ? 1 : 0, { duration: 320, easing: LONG_EASE });
  }, [bg, label, watered]);

  const handleTap = () => {
    if (watered) return;
    Haptics.selectionAsync().catch(() => {});
    // ripple: reset then expand
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 900, easing: LONG_EASE }, (finished) => {
      'worklet';
      if (finished) ripple.value = 0;
    });
    // local animations — keep them snappy even if the prop update is delayed by the store
    bg.value = withTiming(1, { duration: 600, easing: LONG_EASE });
    label.value = withDelay(0, withTiming(0, { duration: 320, easing: LONG_EASE }));
    // schedule the JS callback so the parent updates state
    runOnJS(onWater)();
    // fade in the "watered" label after the 220ms delay specified in the handoff
    label.value = withDelay(220, withTiming(1, { duration: 320, easing: LONG_EASE }));
  };

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bg.value, [0, 1], [colors.clay, colors.moss]),
  }));

  const rippleStyle = useAnimatedStyle(() => {
    const scale = ripple.value * 3.2;
    const fadeOut = ripple.value < 0.6
      ? 0.55 - (ripple.value / 0.6) * 0.2 // 0.55 → 0.35 by 60%
      : 0.35 * (1 - (ripple.value - 0.6) / 0.4); // 0.35 → 0 by 100%
    return {
      transform: [{ scale }],
      opacity: ripple.value === 0 ? 0 : fadeOut,
    };
  });

  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - label.value }));
  const doneStyle = useAnimatedStyle(() => ({ opacity: label.value }));

  return (
    <Pressable onPress={handleTap} disabled={watered} style={({ pressed }) => [pressed && styles.pressed]}>
      <Animated.View style={[styles.btn, bgStyle]}>
        <Animated.View style={[styles.ripple, rippleStyle]} pointerEvents="none" />

        {/* Idle ("Water Marcel") */}
        <Animated.View style={[styles.labelRow, idleStyle]} pointerEvents="none">
          <IconDrop size={18} color={colors.paper} stroke={1.6} />
          <Animated.Text style={styles.label}>Water {name}</Animated.Text>
        </Animated.View>

        {/* Done ("Watered, Tuesday.") */}
        <Animated.View style={[styles.labelRow, styles.absoluteLabel, doneStyle]} pointerEvents="none">
          <IconCheck size={18} color={colors.paper} stroke={1.8} />
          <Animated.Text style={styles.label}>
            Watered{wateredLabel ? `, ${wateredLabel}.` : '.'}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 50,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  ripple: {
    position: 'absolute',
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    backgroundColor: colors.moss,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  absoluteLabel: { position: 'absolute' },
  label: {
    ...text.button,
    fontFamily: fonts.sans.medium,
    color: colors.paper,
  },
});
