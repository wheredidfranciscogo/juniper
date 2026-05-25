/**
 * PlantPressing — herbarium-pressing photo placeholder.
 * A coloured tile with a low-opacity botanical silhouette + species name +
 * museum-tag № label. Stands in for a real plant photo until the user adds one.
 * Ported from design_handoff_jungle_jungle/pressing.jsx.
 */

import * as React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts } from '../theme';
import { IconByName, IconLeaf, PlantIconName } from './icons';

export type PressingTone = 'default' | 'moss' | 'clay' | 'deep';

export interface PressingPlant {
  id: string;
  species: string;
  icon?: PlantIconName;
  pressing?: PressingTone;
}

export interface PressingProps {
  plant: PressingPlant;
  /** width:height ratio. Default 3:4 (taller than wide). */
  ratio?: number;
  /** Larger silhouette + heavier label padding. Use for hero/detail screens. */
  big?: boolean;
  /** Corner radius. 0 for square, 9999 for circular thumb, theme radius for cards. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

interface ToneSpec {
  gradient: readonly [string, string];
  iconColor: string;
  tagColor: string;
  speciesColor: string;
}

const TONES: Record<PressingTone, ToneSpec> = {
  default: {
    gradient: ['#ECE6D5', '#DDD3BC'],
    iconColor: 'rgba(45,55,40,0.40)',
    tagColor: 'rgba(45,42,38,0.40)',
    speciesColor: 'rgba(45,42,38,0.55)',
  },
  moss: {
    gradient: ['#C8CFB8', '#97A48A'],
    iconColor: 'rgba(45,55,40,0.42)',
    tagColor: 'rgba(45,42,38,0.40)',
    speciesColor: 'rgba(45,42,38,0.55)',
  },
  clay: {
    gradient: ['#E8C9B7', '#C99A82'],
    iconColor: 'rgba(135,70,50,0.32)',
    tagColor: 'rgba(45,42,38,0.40)',
    speciesColor: 'rgba(45,42,38,0.55)',
  },
  deep: {
    gradient: ['#6B7758', '#3F4B36'],
    iconColor: 'rgba(230,225,210,0.55)',
    tagColor: 'rgba(245,242,234,0.60)',
    speciesColor: 'rgba(245,242,234,0.85)',
  },
};

export function Pressing({
  plant,
  ratio = 3 / 4,
  big = false,
  radius,
  style,
}: PressingProps) {
  const tone = plant.pressing ?? 'moss';
  const spec = TONES[tone];
  const TheIcon = (plant.icon && IconByName[plant.icon]) || IconLeaf;
  const padding = big ? 22 : 12;
  const tagSize = big ? 10 : 9;
  const speciesSize = big ? 22 : 14;
  const iconSize = big ? 360 : 180;
  const r = radius ?? 0;

  return (
    <View
      style={[
        styles.tile,
        { aspectRatio: ratio, borderRadius: r, padding },
        style,
      ]}
    >
      <LinearGradient
        colors={spec.gradient as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: r }]}
      />

      {/* Botanical silhouette, rotated like a pressed leaf */}
      <View
        pointerEvents="none"
        style={[
          styles.silhouette,
          {
            top: big ? '12%' : '14%',
            right: big ? '-8%' : '-12%',
          },
        ]}
      >
        <TheIcon size={iconSize} stroke={big ? 1.1 : 1.3} color={spec.iconColor} />
      </View>

      {/* Museum tag */}
      <Text
        style={[
          styles.tag,
          {
            top: padding + 2,
            left: padding + 2,
            fontSize: tagSize,
            color: spec.tagColor,
          },
        ]}
      >
        № {plant.id.slice(0, 3).toUpperCase()}
      </Text>

      {/* Species name */}
      <Text
        style={[
          styles.species,
          {
            fontSize: speciesSize,
            color: spec.speciesColor,
            lineHeight: speciesSize * 1.15,
          },
        ]}
        numberOfLines={2}
      >
        {plant.species}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  silhouette: {
    position: 'absolute',
    transform: [{ rotate: '-12deg' }],
  },
  tag: {
    position: 'absolute',
    fontFamily: fonts.mono.regular,
    letterSpacing: 1.08,
    textTransform: 'uppercase',
  },
  species: {
    position: 'relative',
    fontFamily: fonts.serif.regularItalic,
    maxWidth: '70%',
  },
});
