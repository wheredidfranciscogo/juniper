/**
 * You screen — archetype, garden stats, and the controls that make reminders real.
 *
 * DIVERGENCE FROM THE HANDOFF, deliberately (the handoff is otherwise the fidelity
 * source of truth, so this is written down rather than quietly done):
 *
 *  1. The spec lists "Notification preferences" as a chevron row leading elsewhere.
 *     Reminders are implemented inline instead. A row that navigates to a screen that
 *     doesn't exist is a dead affordance, and this is the only surface that can switch
 *     the feature on at all.
 *  2. The time control is a row of preset chips rather than a wheel picker. A native
 *     picker means adding @react-native-community/datetimepicker, which would end
 *     Juniper's ability to run in Expo Go (DECISIONS.md D6) for a control where six
 *     sensible times are genuinely enough.
 *  3. "Watering schedule" is omitted — cadence is per plant and already lives on the
 *     plant's edit form. A global version would contradict it.
 *  4. "Export your journal" is omitted until it works. It's queued as its own task;
 *     it gets a row when there's something behind it.
 */

import * as React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, text } from '../../theme';
import { ARCHETYPES } from '../../data/seed';
import { useStore } from '../../lib/store';
import { durationLabel, formatCount, gardenStats } from '../../lib/stats';
import {
  DEFAULT_TIME,
  getReminderPref,
  hasPermission,
  setReminder,
} from '../../lib/notifications';

/** Six sensible times. See divergence note 2. */
const TIME_OPTIONS = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00'];

/** "09:00" -> "9am", "18:00" -> "6pm" — the app doesn't speak in 24-hour time. */
function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

export default function You() {
  const insets = useSafeAreaInsets();
  const { userName, archetype, plants } = useStore();

  const [enabled, setEnabled] = React.useState(false);
  const [time, setTime] = React.useState(DEFAULT_TIME);
  const [denied, setDenied] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  // Load the stored preference once. If the pref says "on" but the OS permission has
  // since been revoked in Settings, show the toggle as off — claiming reminders are on
  // when nothing will ever fire is the worst of the available lies.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const pref = await getReminderPref();
      const granted = await hasPermission();
      if (cancelled) return;
      setEnabled(pref.enabled && granted);
      setDenied(pref.enabled && !granted);
      setTime(pref.time);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const archetypeInfo = ARCHETYPES[archetype];
  const stats = React.useMemo(() => gardenStats(plants, new Date()), [plants]);

  const onToggle = async (next: boolean) => {
    setEnabled(next); // optimistic — reverted below if permission is refused
    const ok = await setReminder(next, { time, plants });
    if (!ok) {
      setEnabled(false);
      setDenied(true);
      return;
    }
    setDenied(false);
  };

  const onPickTime = async (next: string) => {
    setTime(next);
    if (enabled) await setReminder(true, { time: next, plants });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.section, paddingBottom: insets.bottom + spacing.section },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.overline}>YOU ARE</Text>
      <Text style={styles.title}>{archetypeInfo.name}</Text>
      <Text style={styles.body}>{archetypeInfo.body}</Text>

      {/* ---------- Stats ---------- */}
      <View style={styles.card}>
        <Stat
          label="IN YOUR CARE"
          value={`${stats.plantCount} plant${stats.plantCount === 1 ? '' : 's'}`}
        />
        <View style={styles.divider} />
        <Stat
          label="LONGEST TENDED"
          value={stats.longest ? durationLabel(stats.longest.days) : '—'}
          caption={stats.longest?.name}
        />
        <View style={styles.divider} />
        <Stat label="PLANT-DAYS" value={formatCount(stats.plantDays)} />
      </View>

      {/* ---------- Reminders ---------- */}
      <Text style={[styles.overline, styles.sectionGap]}>REMINDERS</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Tell me when to water</Text>
            <Text style={styles.rowHint}>
              {enabled
                ? `A quiet nudge at ${prettyTime(time)}, only on the days a plant is due.`
                : 'Off. Juniper will keep the record, but stay silent.'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            disabled={!loaded}
            trackColor={{ false: colors.hairlineStrong, true: colors.moss }}
            thumbColor={colors.paper}
            ios_backgroundColor={colors.hairlineStrong}
          />
        </View>

        {enabled && (
          <>
            <View style={styles.divider} />
            <View style={styles.timeBlock}>
              <Text style={styles.rowHint}>Remind me at</Text>
              <View style={styles.chips}>
                {TIME_OPTIONS.map((option) => {
                  const active = option === time;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => onPickTime(option)}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {prettyTime(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>

      {denied && (
        <Pressable style={styles.notice} onPress={() => Linking.openSettings().catch(() => {})}>
          <Text style={styles.noticeText}>
            Notifications are turned off for Juniper in your phone&apos;s settings. Tap to open
            them.
          </Text>
        </Pressable>
      )}

      {enabled && stats.plantCount === 0 && (
        <Text style={styles.footnote}>
          Nothing to remind you about yet — add a plant and the first nudge will schedule itself.
        </Text>
      )}

      {/* ---------- About ---------- */}
      <Text style={[styles.overline, styles.sectionGap]}>ABOUT</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Juniper</Text>
            <Text style={styles.rowHint}>
              Everything you enter stays on this phone. No account, no server, nothing uploaded.
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>
        — tending {stats.plantCount} plant{stats.plantCount === 1 ? '' : 's'} as{' '}
        {userName || 'friend'} —
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {caption ? <Text style={styles.statCaption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.page, gap: spacing.md },

  overline: text.overline,
  title: { ...text.archetypeTitle, fontSize: 32 },
  body: { ...text.blurb, marginBottom: spacing.md },
  sectionGap: { marginTop: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.hairline },

  stat: { paddingVertical: spacing.base, paddingHorizontal: spacing.lg, gap: 2 },
  statLabel: text.overlineSm,
  statValue: { ...text.rowName },
  statCaption: text.species,

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: text.rowName,
  rowHint: text.hint,

  timeBlock: { paddingVertical: spacing.base, paddingHorizontal: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.paper,
  },
  chipActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  chipLabel: { ...text.hint, color: colors.ink },
  chipLabelActive: { color: colors.paper },

  notice: {
    borderWidth: 1,
    borderColor: colors.dried,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  noticeText: { ...text.hint, color: colors.dried },

  footnote: { ...text.hint, paddingHorizontal: spacing.xs },
  footer: { ...text.footer, textAlign: 'center', marginTop: spacing.section },
});
