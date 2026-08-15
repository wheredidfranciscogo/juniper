/**
 * Today screen.
 * Greeting + date overline → horizontal scroll of thirsty cards (or empty state)
 * → upcoming list ("ALL CAUGHT UP LATER THIS WEEK") → archetype footer.
 */

import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, text } from '../../theme';
import { ARCHETYPES } from '../../data/seed';
import type { Plant } from '../../data/types';
import { useStore } from '../../lib/store';
import { greetingFor, lastWateredLabel } from '../../lib/today-utils';
import { daysSinceWatered, daysUntilWater, isThirsty } from '../../lib/watering';
import { Pressing } from '../../components/Pressing';
import { Pill } from '../../components/Pill';
import { WaterButton } from '../../components/WaterButton';
import { IconCheck } from '../../components/icons';

export default function Today() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName, archetype, plants, waterPlant } = useStore();

  // Recomputed against the clock on every render — see src/lib/watering.ts for why
  // this is derived rather than stored.
  const now = new Date();
  const thirsty = plants.filter((p) => isThirsty(p, now));
  const upcoming = plants
    .filter((p) => !isThirsty(p, now))
    .map((p) => ({ ...p, daysRemaining: daysUntilWater(p, now) }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const cardWidth = Math.round(width * 0.85);
  const archetypeName = ARCHETYPES[archetype].name;
  const dateLabel = new Date()
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toLowerCase();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetingBlock}>
        <Text style={styles.dateOverline}>{dateLabel}</Text>
        <Text style={styles.greeting}>
          {greetingFor()}, {userName || 'friend'}.
        </Text>
      </View>

      {/* Thirsty section */}
      {thirsty.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + spacing.md}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.page, gap: spacing.md }}
          style={styles.thirstyRow}
        >
          {thirsty.map((p) => (
            <ThirstyCard
              key={p.id}
              plant={p}
              width={cardWidth}
              onWater={() => waterPlant(p.id)}
              onOpen={() => router.push({ pathname: '/plant/[id]', params: { id: p.id } })}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.emptyCard, { marginHorizontal: spacing.page }]}>
          <IconCheck size={26} color={colors.moss} stroke={1.4} />
          <Text style={styles.emptyTitle}>Nothing to water today.</Text>
          <Text style={styles.emptyBody}>Maybe take a slow walk past them.</Text>
        </View>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <View style={styles.upcoming}>
          <Text style={styles.upcomingOverline}>ALL CAUGHT UP LATER THIS WEEK</Text>
          {upcoming.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/plant/[id]', params: { id: p.id } })}
              style={({ pressed }) => [
                styles.upcomingRow,
                i === 0 && styles.upcomingRowFirst,
                pressed && styles.upcomingRowPressed,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingName}>{p.name}</Text>
                <Text style={styles.upcomingSpecies}>{p.species}</Text>
              </View>
              <Text style={styles.upcomingDays}>
                in {p.daysRemaining}d
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        — {archetypeName}, tending {plants.length} plant{plants.length === 1 ? '' : 's'} —
      </Text>
    </ScrollView>
  );
}

/* ---------- ThirstyCard ---------- */

function ThirstyCard({
  plant,
  width,
  onWater,
  onOpen,
}: {
  plant: Plant;
  width: number;
  onWater: () => void;
  onOpen: () => void;
}) {
  const watered = daysSinceWatered(plant, new Date()) === 0;
  return (
    <View style={[styles.card, { width }]}>
      <Pressable onPress={onOpen}>
        <Pressing plant={plant} ratio={4 / 3} radius={radii.lg} />
      </Pressable>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{plant.name}</Text>
            <Text style={styles.cardSpecies}>{plant.species}</Text>
          </View>
          <Pill tone={watered ? 'moss' : 'dried'}>{watered ? 'WATERED' : 'THIRSTY'}</Pill>
        </View>
        <WaterButton
          name={plant.name}
          watered={watered}
          wateredLabel={new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
          onWater={onWater}
        />
        <Text style={styles.lastWatered}>{lastWateredLabel(daysSinceWatered(plant, new Date()))}</Text>
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { gap: spacing.section },

  greetingBlock: { paddingHorizontal: spacing.page, gap: 6 },
  dateOverline: text.overline,
  greeting: text.greeting,

  thirstyRow: { marginHorizontal: -spacing.page, paddingLeft: 0 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  cardBody: { padding: 18, gap: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardName: text.cardName,
  cardSpecies: text.species,
  lastWatered: text.lastWatered,

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.section,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { ...text.blurb, fontStyle: 'italic', textAlign: 'center' },
  emptyBody: { ...text.bodyMuted, textAlign: 'center' },

  upcoming: { paddingHorizontal: spacing.page, gap: 4 },
  upcomingOverline: { ...text.overlineMd, marginBottom: 8 },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  upcomingRowFirst: { borderTopWidth: 1, borderTopColor: colors.hairline },
  upcomingRowPressed: { backgroundColor: colors.surface },
  upcomingName: text.upcomingName,
  upcomingSpecies: text.species,
  upcomingDays: { ...text.monoTimestamp, textTransform: 'lowercase' },

  footer: { ...text.footer, textAlign: 'center', marginTop: spacing.section },
});
