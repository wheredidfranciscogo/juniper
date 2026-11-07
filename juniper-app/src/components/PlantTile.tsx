/**
 * PlantTile — one plant, one square. The unit the garden grid is built from.
 *
 * THE SQUARE IS A COLOUR FIELD WITH THE PHOTOGRAPH MATTED INSIDE IT, like a pressed
 * specimen mounted on card. The mount carries the colour and drifts moss → dried as
 * the plant goes from watered to due; the photograph stays untouched inside it. Washing
 * the colour over the image instead would have meant the plants you most need to
 * recognise are the ones rendered muddiest.
 *
 * Nothing here ticks. Dryness changes over days, so the colour is correct on mount and
 * animates only when the value actually moves — which in practice means the moment the
 * plant is watered. That is the one transition worth animating, and it gets a pop of
 * full moss over the top of the ramp so the tap visibly did something.
 *
 * The drop in the corner waters the plant from the grid, without opening it. See
 * DECISIONS.md D12: making you go a level deeper to act would defeat an ambient view.
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BEZIER_LONG, colors, radii, text } from '../theme';
import type { Plant } from '../data/types';
import { coverPhotoUri } from '../lib/cover';
import { waterTap } from '../lib/haptics';
import { IconCheck, IconDrop } from './icons';
import { Pressing } from './Pressing';

const LONG_EASE = Easing.bezier(BEZIER_LONG[0], BEZIER_LONG[1], BEZIER_LONG[2], BEZIER_LONG[3]);

/** The mat, at its two extremes. Both are theme tokens; neither is red or alarming. */
const RAMP = [colors.mossSoft, colors.dried] as const;

/** Width of the coloured mount around the photograph. */
const MAT = 7;

export interface PlantTileProps {
  plant: Plant;
  /** 0 = watered today, 1 = due. Comes from src/lib/dryness.ts. */
  dryness: number;
  /** Spoken state, e.g. "Marcel, 3 days to go" — colour alone is not an interface. */
  label: string;
  /** Already watered today: the drop becomes a tick and stops accepting taps. */
  wateredToday: boolean;
  /** Tile side length in points. The grid measures this once and passes it down. */
  size: number;
  onOpen: () => void;
  onWater: () => void;
}

export function PlantTile({
  plant,
  dryness,
  label,
  wateredToday,
  size,
  onOpen,
  onWater,
}: PlantTileProps) {
  // Initialised to the real value so a remount (tab switch, re-render) doesn't animate
  // in from the wrong colour.
  const wash = useSharedValue(dryness);
  const pop = useSharedValue(0);

  React.useEffect(() => {
    wash.value = withTiming(dryness, { duration: 900, easing: LONG_EASE });
  }, [wash, dryness]);

  const matStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(wash.value, [0, 1], [RAMP[0], RAMP[1]]),
  }));

  // Full moss, laid over the ramp and faded out. Compositing it as its own layer keeps
  // the ramp itself a single clean two-stop interpolation.
  const popStyle = useAnimatedStyle(() => ({ opacity: pop.value }));

  const handleWater = () => {
    if (wateredToday) return;
    waterTap();
    pop.value = withTiming(1, { duration: 180, easing: LONG_EASE }, () => {
      'worklet';
      pop.value = withTiming(0, { duration: 1100, easing: LONG_EASE });
    });
    onWater();
  };

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}
      testID={`tile-${plant.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens this plant"
    >
      <Animated.View style={[styles.mat, matStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.pop, popStyle]}
        />

        <View style={styles.photo}>
          <Pressing plant={plant} ratio={1} radius={radii.sm} uri={coverPhotoUri(plant)} />
        </View>

        <Pressable
          onPress={handleWater}
          hitSlop={10}
          disabled={wateredToday}
          style={({ pressed }) => [
            styles.drop,
            wateredToday && styles.dropDone,
            pressed && styles.dropPressed,
          ]}
          testID={`tile-water-${plant.id}`}
          accessibilityRole="button"
          accessibilityLabel={
            wateredToday ? `${plant.name} was watered today` : `Water ${plant.name}`
          }
        >
          {wateredToday ? (
            <IconCheck size={13} color={colors.paper} stroke={2} />
          ) : (
            <IconDrop size={13} color={colors.paper} stroke={1.8} />
          )}
        </Pressable>
      </Animated.View>

      <Text style={styles.name} numberOfLines={1}>
        {plant.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  mat: {
    flex: 1,
    borderRadius: radii.md,
    padding: MAT,
    overflow: 'hidden',
  },
  pop: { backgroundColor: colors.moss, borderRadius: radii.md },
  photo: {
    flex: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  drop: {
    position: 'absolute',
    right: MAT + 4,
    bottom: MAT + 4,
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,42,38,0.55)',
  },
  dropDone: { backgroundColor: 'rgba(63,93,62,0.75)' },
  dropPressed: { backgroundColor: colors.clay, transform: [{ scale: 0.92 }] },
  name: {
    ...text.rowName,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
