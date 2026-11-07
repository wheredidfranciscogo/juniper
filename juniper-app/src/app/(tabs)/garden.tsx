/**
 * The Garden — the app's home, and a grid rather than a list.
 *
 * Every plant is one square. The square's mount drifts moss → dried as the plant goes
 * from watered to due, so a single glance reports the whole garden without a word being
 * read; the drop in a square's corner waters it without leaving the screen; tapping a
 * square expands it in place. This replaced both the Today card carousel and the
 * filtered Garden list — see DECISIONS.md D12.
 *
 * THERE ARE NO FILTERS, deliberately. A list needs sorting and filtering because its
 * rows all look alike; a grid does not, because colour carries the state and position
 * makes each plant recognisable. "Thirsty" was the only filter anyone wanted and the
 * grid answers it before you could tap a chip.
 *
 * Order is thirstiest-first, computed once per render from a single `now` so every tile
 * agrees, and tie-broken on name so the layout cannot shuffle under your thumb.
 */

import * as React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, text } from '../../theme';
import type { Plant } from '../../data/types';
import { useStore } from '../../lib/store';
import { byThirst, dryness, drynessLabel } from '../../lib/dryness';
import { daysSinceWatered } from '../../lib/watering';
import { greetingFor } from '../../lib/today-utils';
import { focusTap } from '../../lib/haptics';
import { PlantTile } from '../../components/PlantTile';
import { PlantPeek, type TileRect } from '../../components/PlantPeek';

const COLUMNS = 3;
const GAP = 12;

export default function Garden() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { plants, userName, waterPlant } = useStore();

  const [openId, setOpenId] = React.useState<string | null>(null);
  const [openFrom, setOpenFrom] = React.useState<TileRect | null>(null);
  // Bumped when the grid settles after a scroll, so each tile re-caches its window rect.
  const [measureToken, setMeasureToken] = React.useState(0);
  const restAfterScroll = () => setMeasureToken((n) => n + 1);

  // One clock for the whole render. Tiles sorted by one `now` and coloured by another
  // would disagree about which plant is thirstiest.
  const now = new Date();

  const tileSize = Math.floor((width - spacing.page * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const ordered = React.useMemo(
    () => [...plants].sort((a, b) => byThirst(a, b, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plants],
  );

  const open = plants.find((p) => p.id === openId) ?? null;

  const handleOpen = (plant: Plant, rect: TileRect | null) => {
    focusTap();
    setOpenFrom(rect);
    setOpenId(plant.id);
  };

  const thirstyCount = ordered.filter((p) => dryness(p, now) >= 1).length;

  return (
    <View style={styles.root}>
      <ScrollView
        onMomentumScrollEnd={restAfterScroll}
        onScrollEndDrag={restAfterScroll}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greetingFor(now)}
            {userName ? `, ${userName}` : ''}
          </Text>
          <Text style={styles.overline}>{subtitle(plants.length, thirstyCount)}</Text>
        </View>

        {plants.length === 0 ? (
          <Text style={styles.empty}>
            No plants yet. Add your first with the button below.
          </Text>
        ) : (
          <View style={styles.grid}>
            {ordered.map((plant) => (
              <MeasuredTile
                key={plant.id}
                plant={plant}
                size={tileSize}
                dryness={dryness(plant, now)}
                label={drynessLabel(plant, now)}
                wateredToday={daysSinceWatered(plant, now) === 0}
                measureToken={measureToken}
                onOpen={(rect) => handleOpen(plant, rect)}
                onWater={() => waterPlant(plant.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {open && (
        <PlantPeek
          plant={open}
          from={openFrom}
          now={now}
          onClose={() => setOpenId(null)}
          onWater={() => waterPlant(open.id)}
          onOpenRecord={() => {
            setOpenId(null);
            router.push({ pathname: '/plant/[id]', params: { id: open.id } });
          }}
        />
      )}
    </View>
  );
}

/** "6 plants in your care · 2 ready for water" — a count, not a verdict. */
function subtitle(total: number, thirsty: number): string {
  const plants = `${total} plant${total === 1 ? '' : 's'} in your care`;
  if (thirsty === 0) return plants;
  return `${plants} · ${thirsty} ready for water`;
}

/**
 * Wraps a tile so its on-screen rect can be handed to the peek, which animates out of
 * it.
 *
 * THE RECT IS CACHED, NOT MEASURED ON PRESS. `measureInWindow` answers through a bridge
 * round-trip, so waiting for it before opening would put a frame or two of nothing
 * between the tap and the response — and under Jest the callback never fires at all, so
 * a press-time measurement meant the peek could not be tested. Opening is synchronous
 * and uses whatever the cache holds; a null cache is a supported input to the peek,
 * which then scales up from the centre instead.
 *
 * The cache is filled on layout and refreshed whenever the grid settles after a scroll,
 * since window coordinates go stale the moment the list moves.
 *
 * `collapsable={false}` is load-bearing on Android: a plain View with no background is
 * collapsed out of the native hierarchy there and cannot be measured at all.
 */
function MeasuredTile({
  plant,
  size,
  dryness: d,
  label,
  wateredToday,
  measureToken,
  onOpen,
  onWater,
}: {
  plant: Plant;
  size: number;
  dryness: number;
  label: string;
  wateredToday: boolean;
  /** Bumped by the grid when positions may have changed, to re-fill the cache. */
  measureToken: number;
  onOpen: (rect: TileRect | null) => void;
  onWater: () => void;
}) {
  const ref = React.useRef<View | null>(null);
  const rect = React.useRef<TileRect | null>(null);

  const measure = React.useCallback(() => {
    const node = ref.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      rect.current = [x, y, width, height].every(
        (n) => typeof n === 'number' && Number.isFinite(n),
      )
        ? { x, y, width, height }
        : null;
    });
  }, []);

  React.useEffect(measure, [measure, measureToken]);

  return (
    <View ref={ref} collapsable={false} onLayout={measure}>
      <PlantTile
        plant={plant}
        size={size}
        dryness={d}
        label={label}
        wateredToday={wateredToday}
        onOpen={() => onOpen(rect.current)}
        onWater={onWater}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { gap: spacing.lg },

  header: { paddingHorizontal: spacing.page, gap: 6 },
  greeting: text.greeting,
  overline: text.overline,

  grid: {
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },

  empty: {
    ...text.bodyMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.section,
  },
});
