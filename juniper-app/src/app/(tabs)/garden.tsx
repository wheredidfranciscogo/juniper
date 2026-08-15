/**
 * Garden screen.
 * Overline + heading → filter chips (All / Thirsty / Indoor / Outdoor) → list.
 * Only the "Thirsty" filter actually filters in V1 — Indoor/Outdoor await metadata.
 */

import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, text } from '../../theme';
import type { Plant } from '../../data/types';
import { useStore } from '../../lib/store';
import { daysUntilWater, isThirsty } from '../../lib/watering';
import { Pressing } from '../../components/Pressing';

type Filter = 'all' | 'thirsty' | 'indoor' | 'outdoor';

const FILTERS: { v: Filter; label: string }[] = [
  { v: 'all', label: 'All' },
  { v: 'thirsty', label: 'Thirsty' },
  { v: 'indoor', label: 'Indoor' },
  { v: 'outdoor', label: 'Outdoor' },
];

export default function Garden() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plants } = useStore();
  const [filter, setFilter] = React.useState<Filter>('all');

  const filtered = React.useMemo(() => {
    if (filter === 'thirsty') return plants.filter((p) => isThirsty(p, new Date()));
    return plants;
  }, [plants, filter]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.overline}>
          {plants.length} plant{plants.length === 1 ? '' : 's'} in your care
        </Text>
        <Text style={styles.title}>The Garden</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {FILTERS.map(({ v, label }) => (
          <Pressable
            key={v}
            onPress={() => setFilter(v)}
            style={[styles.chip, filter === v && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, filter === v && styles.chipLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet.</Text>
        ) : (
          filtered.map((p, i) => (
            <Row
              key={p.id}
              plant={p}
              isFirst={i === 0}
              onPress={() => router.push({ pathname: '/plant/[id]', params: { id: p.id } })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Row({
  plant,
  isFirst,
  onPress,
}: {
  plant: Plant;
  isFirst: boolean;
  onPress: () => void;
}) {
  const now = new Date();
  const thirsty = isThirsty(plant, now);
  const daysRemaining = daysUntilWater(plant, now);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, isFirst && styles.rowFirst, pressed && styles.rowPressed]}
    >
      <View style={styles.thumb}>
        <Pressing plant={plant} ratio={1} radius={radii.pill} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{plant.name}</Text>
        <Text style={styles.rowSpecies}>{plant.species}</Text>
      </View>
      <Text style={[styles.rowDays, thirsty && styles.rowDaysThirsty]}>
        {thirsty ? 'thirsty' : `in ${daysRemaining}d`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { gap: spacing.lg },

  header: { paddingHorizontal: spacing.page, gap: 6 },
  overline: text.overline,
  title: text.sectionTitle,

  chipsContainer: {
    paddingHorizontal: spacing.page,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: 'transparent',
  },
  chipActive: { borderColor: colors.ink, backgroundColor: colors.paper },
  chipLabel: {
    fontSize: 13,
    color: colors.inkMuted,
    letterSpacing: 0.13,
    fontFamily: 'PublicSans_400Regular',
  },
  chipLabelActive: { color: colors.ink },

  list: { paddingHorizontal: spacing.page },
  empty: { ...text.bodyMuted, textAlign: 'center', paddingVertical: spacing.section },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowFirst: { borderTopWidth: 1, borderTopColor: colors.hairline },
  rowPressed: { backgroundColor: colors.surface },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: text.rowName,
  rowSpecies: { ...text.species, fontSize: 13 },
  rowDays: { ...text.monoTimestamp, textTransform: 'lowercase' },
  rowDaysThirsty: { color: colors.clay },
});
