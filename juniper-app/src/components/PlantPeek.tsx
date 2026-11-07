/**
 * PlantPeek — the square, opened.
 *
 * Grows out of the tile you tapped rather than sliding in from an edge: the tile's
 * window rect is measured on press and handed over, so the card starts at that exact
 * position and size and expands to the centre. That is what makes it read as *this
 * square getting bigger* instead of a modal appearing over it.
 *
 * It carries only what you want on opening a plant — the photograph large, when it was
 * watered, when it is next due, and the water button if it needs one. Everything that
 * accumulates (the photo timeline, the per-plant log, editing) stays on Plant Detail,
 * one tap further in. See DECISIONS.md D12: the peek is a look, not a replacement for
 * the record.
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BEZIER_LONG, colors, radii, spacing, text } from '../theme';
import type { Plant } from '../data/types';
import { coverPhotoUri } from '../lib/cover';
import { daysSinceWatered, daysUntilWater } from '../lib/watering';
import { lastWateredLabel } from '../lib/today-utils';
import { waterTap } from '../lib/haptics';
import { IconClose, IconDrop } from './icons';
import { Pressing } from './Pressing';

const LONG_EASE = Easing.bezier(BEZIER_LONG[0], BEZIER_LONG[1], BEZIER_LONG[2], BEZIER_LONG[3]);
const OPEN_MS = 320;
const CLOSE_MS = 220;

/** Where the tapped tile was, in window coordinates. */
export interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlantPeekProps {
  plant: Plant;
  /** The tile this was opened from. Null falls back to a plain centred scale-up. */
  from: TileRect | null;
  now: Date;
  onClose: () => void;
  onWater: () => void;
  onOpenRecord: () => void;
}

export function PlantPeek({
  plant,
  from,
  now,
  onClose,
  onWater,
  onOpenRecord,
}: PlantPeekProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const cardW = Math.min(winW - spacing.page * 2, 420);
  // The photograph is square, but never so tall that the text below it is pushed off a
  // short screen.
  const photoH = Math.min(cardW, winH - insets.top - insets.bottom - 280);

  const progress = useSharedValue(0);
  const [closing, setClosing] = React.useState(false);

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: OPEN_MS, easing: LONG_EASE });
  }, [progress]);

  const close = React.useCallback(() => {
    if (closing) return;
    setClosing(true);
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: LONG_EASE });
    // Unmount after the animation rather than from its callback, so the parent's state
    // update never lands on the UI thread.
    setTimeout(onClose, CLOSE_MS);
  }, [closing, onClose, progress]);

  // The card is centred in the overlay, so its centre is the overlay's centre.
  const centreX = winW / 2;
  const centreY = insets.top + (winH - insets.top - insets.bottom) / 2;

  const startScale = from ? Math.max(0.2, from.width / cardW) : 0.88;
  const startDX = from ? from.x + from.width / 2 - centreX : 0;
  const startDY = from ? from.y + from.height / 2 - centreY : 0;

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [startDX, 0]) },
      { translateY: interpolate(progress.value, [0, 1], [startDY, 0]) },
      { scale: interpolate(progress.value, [0, 1], [startScale, 1]) },
    ],
  }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const wateredToday = daysSinceWatered(plant, now) === 0;
  const remaining = daysUntilWater(plant, now);
  const dueText =
    remaining <= 0
      ? 'Due for water'
      : remaining === 1
        ? 'Due tomorrow'
        : `Due in ${remaining} days`;

  const handleWater = () => {
    if (wateredToday) return;
    waterTap();
    onWater();
  };

  return (
    <View style={StyleSheet.absoluteFill} testID="plant-peek">
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="peek-scrim"
        />
      </Animated.View>

      <View style={styles.centre} pointerEvents="box-none">
        <Animated.View style={[styles.card, { width: cardW }, cardStyle]}>
          <View style={[styles.photo, { height: photoH }]}>
            <Pressing
              plant={plant}
              ratio={1}
              big
              radius={radii.lg}
              uri={coverPhotoUri(plant)}
            />
          </View>

          <View style={styles.body}>
            <Text style={styles.name}>{plant.name}</Text>
            <Text style={styles.species}>{plant.species}</Text>

            <View style={styles.facts}>
              <Text style={styles.fact}>
                {lastWateredLabel(daysSinceWatered(plant, now), now)}
              </Text>
              <Text style={[styles.fact, remaining <= 0 && styles.factDue]}>{dueText}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={handleWater}
                disabled={wateredToday}
                style={({ pressed }) => [
                  styles.water,
                  wateredToday && styles.waterDone,
                  pressed && styles.waterPressed,
                ]}
                testID="peek-water"
                accessibilityRole="button"
                accessibilityLabel={
                  wateredToday ? `${plant.name} was watered today` : `Water ${plant.name}`
                }
              >
                {!wateredToday && <IconDrop size={15} color={colors.paper} stroke={1.8} />}
                <Text style={[styles.waterLabel, wateredToday && styles.waterLabelDone]}>
                  {wateredToday ? 'Watered today' : `Water ${plant.name}`}
                </Text>
              </Pressable>

              <Pressable
                onPress={onOpenRecord}
                style={styles.record}
                testID="peek-record"
                accessibilityRole="button"
                accessibilityLabel={`Open the full record for ${plant.name}`}
              >
                <Text style={styles.recordLabel}>The full record</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={close}
            hitSlop={10}
            style={styles.close}
            testID="peek-close"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <IconClose size={16} color={colors.paper} stroke={1.8} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(45,42,38,0.45)' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  photo: { width: '100%', backgroundColor: colors.surface2 },
  body: { padding: spacing.lg, gap: 2 },
  name: text.plantHero,
  species: text.species,
  facts: { marginTop: spacing.md, gap: 2 },
  fact: text.bodyMuted,
  factDue: { color: colors.clay },
  actions: { marginTop: spacing.base, gap: spacing.md },
  water: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.clay,
  },
  waterDone: { backgroundColor: colors.surface2 },
  waterPressed: { backgroundColor: colors.clayDeep },
  waterLabel: { ...text.button, color: colors.paper },
  waterLabelDone: { color: colors.inkMuted },
  record: { alignItems: 'center', paddingVertical: 4 },
  recordLabel: { ...text.ghostButton },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,42,38,0.45)',
  },
});
