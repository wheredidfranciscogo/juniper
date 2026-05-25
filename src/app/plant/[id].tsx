/**
 * Plant Detail screen.
 * Hero pressing → tended overline + name + species + nickname → stat row →
 * water button (signature animation) → action row → photo timeline → per-plant log.
 */

import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, spacing, text } from '../../theme';
import { useStore } from '../../lib/store';
import type { LogKind } from '../../data/types';
import { Pressing } from '../../components/Pressing';
import { WaterButton } from '../../components/WaterButton';
import { LogFeed } from '../../components/LogFeed';
import {
  IconBack,
  IconPencil,
  IconDrop,
  IconSun,
  IconThermometer,
  IconCactus,
  IconSparkle,
  IconWindow,
  IconJournal,
  type IconProps,
} from '../../components/icons';

export default function PlantDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plants, log, waterPlant, logAction } = useStore();
  const plant = plants.find((p) => p.id === id);

  const plantLog = React.useMemo(
    () => (plant ? log.filter((e) => e.plantId === plant.id) : []),
    [log, plant],
  );

  if (!plant) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top + spacing.section }]}>
        <Text style={text.sectionTitle}>Plant not found.</Text>
      </View>
    );
  }

  const watered = plant.daysSinceWater === 0;
  const wateredLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.section }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero pressing */}
        <View style={styles.hero}>
          <Pressing plant={plant} ratio={4 / 5} radius={0} big />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.tended}>TENDED FOR {plant.tendedDays} DAYS</Text>
          <Text style={styles.name}>{plant.name}</Text>
          <Text style={styles.species}>{plant.species}</Text>
          {plant.nickname ? <Text style={styles.nickname}>{plant.nickname}</Text> : null}

          {/* Stat row */}
          <View style={styles.stats}>
            <Stat Icon={IconDrop} label={`every ${plant.waterEvery} days`} />
            <Stat Icon={IconSun} label={plant.light} />
            <Stat Icon={IconThermometer} label={plant.temp} />
          </View>

          {/* Water button */}
          <WaterButton
            name={plant.name}
            watered={watered}
            wateredLabel={wateredLabel}
            onWater={() => waterPlant(plant.id)}
          />

          {/* Action row */}
          <View style={styles.actionRow}>
            <ActionBtn Icon={IconCactus} label="Repot" onPress={() => logAction(plant.id, 'repot')} />
            <ActionBtn Icon={IconSparkle} label="Fertilise" onPress={() => logAction(plant.id, 'fertilize')} />
            <ActionBtn Icon={IconWindow} label="Move" onPress={() => logAction(plant.id, 'move')} />
            <ActionBtn Icon={IconJournal} label="Note" onPress={() => logAction(plant.id, 'note', 'Wrote a note.')} />
          </View>

          {/* Photo timeline */}
          {plant.photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionOverline}>A SLOW RECORD</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeline}
              >
                {plant.photos.map((photo, i) => (
                  <View key={i} style={styles.timelineTile}>
                    <Pressing plant={plant} ratio={4 / 5} radius={radii.md} />
                    <Text style={styles.timelineDate}>
                      {new Date(photo.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
                    </Text>
                    {photo.label ? <Text style={styles.timelineCaption}>{photo.label}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Per-plant log */}
          <View style={styles.section}>
            <Text style={styles.sectionOverline}>THEIR LOG</Text>
            <LogFeed log={plantLog} showGroupHeaders={false} />
          </View>
        </View>
      </ScrollView>

      {/* Floating back + edit */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.float, styles.floatLeft, { top: insets.top + 10 }]}
        hitSlop={10}
      >
        <IconBack size={20} color={colors.ink} />
      </Pressable>
      <Pressable
        style={[styles.float, styles.floatRight, { top: insets.top + 10 }]}
        hitSlop={10}
      >
        <IconPencil size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/* ---------- Sub-components ---------- */

function Stat({ Icon, label }: { Icon: React.FC<IconProps>; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon size={15} color={colors.moss} stroke={1.4} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionBtn({
  Icon,
  label,
  onPress,
}: {
  Icon: React.FC<IconProps>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
      <Icon size={20} color={colors.ink} stroke={1.4} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  notFound: { flex: 1, alignItems: 'center', backgroundColor: colors.paper },

  hero: { width: '100%' },
  body: { padding: spacing.page, gap: spacing.base },
  tended: { ...text.overline, marginTop: 8 },
  name: text.plantHero,
  species: text.speciesLg,
  nickname: { fontFamily: fonts.sans.regular, fontStyle: 'italic', fontSize: 13, color: colors.inkFaint, marginTop: 2 },

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 8,
    marginTop: 8,
    marginBottom: spacing.base,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontFamily: fonts.serif.regular, fontSize: 15, color: colors.ink },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  actionBtnPressed: { backgroundColor: colors.surface },
  actionLabel: { fontFamily: fonts.sans.regular, fontSize: 12, color: colors.ink },

  section: { marginTop: spacing.section, gap: spacing.base },
  sectionOverline: text.overlineMd,

  timeline: { gap: 12, paddingRight: spacing.page },
  timelineTile: { width: 120, gap: 8 },
  timelineDate: { ...text.monoTimestamp, fontSize: 9, letterSpacing: 1.4 },
  timelineCaption: { fontFamily: fonts.serif.regularItalic, fontSize: 12, color: colors.inkMuted },

  float: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(250,249,245,0.85)',
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatLeft: { left: spacing.page },
  floatRight: { right: spacing.page },
});
