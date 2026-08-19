/**
 * You screen — a greeting, garden stats, reminders, and your data.
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
 *  4. "Export your journal" is a real row — it writes the whole garden to JSON and hands
 *     it to the share sheet, with an import beside it.
 *  5. The archetype is gone entirely. The handoff opened this screen with "YOU ARE / The
 *     Plant Whisperer" and a paragraph of character description; it was decoration that
 *     told you nothing about your plants. So is "plant-days", which was a number with no
 *     interpretation. Both removed on user feedback.
 */

import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, text } from '../../theme';
import { useStore } from '../../lib/store';
import { durationLabel, gardenStats } from '../../lib/stats';
import {
  DEFAULT_TIME,
  getReminderPref,
  hasPermission,
  setReminder,
} from '../../lib/notifications';
import { exportBackup, pickBackup, type ParsedBackup } from '../../lib/backup';

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
  const { userName, plants, log, replaceGarden } = useStore();

  const [enabled, setEnabled] = React.useState(false);
  const [time, setTime] = React.useState(DEFAULT_TIME);
  const [denied, setDenied] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

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

  const onExport = async () => {
    setExporting(true);
    try {
      const result = await exportBackup({ onboarded: true, userName, plants, log });
      if (result.ok) return;
      Alert.alert(
        result.reason === 'empty' ? 'Nothing to back up yet' : 'Could not export',
        result.reason === 'empty'
          ? 'Add a plant first — then there will be a garden worth keeping a copy of.'
          : result.reason === 'unavailable'
            ? 'Sharing is not available on this device.'
            : 'Something went wrong writing the file. Try again.',
      );
    } finally {
      setExporting(false);
    }
  };

  /**
   * Restore from a backup file. REPLACES the garden — see DECISIONS.md D10.
   *
   * The confirmation names real numbers on both sides. "Are you sure?" is not enough
   * for an act that is irreversible, has no undo, and has no server-side copy to fall
   * back on.
   */
  const onImport = async () => {
    setImporting(true);
    let result;
    try {
      result = await pickBackup();
    } finally {
      setImporting(false);
    }

    if (!result.ok) {
      if (result.reason === 'cancelled') return;
      const message: Record<string, string> = {
        'not-json': "That file isn't readable as a backup — it may be damaged, or not the file you meant.",
        'not-juniper': "That doesn't look like a Juniper backup.",
        'future-format': 'That backup was made by a newer version of Juniper. Update the app first.',
        'no-plants': "That backup doesn't contain any plants Juniper can read.",
        unreadable: "That file couldn't be opened.",
      };
      Alert.alert('Could not restore', message[result.reason] ?? 'Something went wrong.');
      return;
    }

    confirmRestore(result.data);
  };

  const confirmRestore = (data: ParsedBackup) => {
    const taken = data.exportedAt
      ? new Date(data.exportedAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'an unknown date';

    const incoming = `${data.plants.length} plant${data.plants.length === 1 ? '' : 's'} and ${data.log.length} log ${data.log.length === 1 ? 'entry' : 'entries'}`;
    const dropped =
      data.skipped.plants > 0
        ? `\n\n${data.skipped.plants} entr${data.skipped.plants === 1 ? 'y' : 'ies'} in the file couldn't be read and will be left out.`
        : '';

    // Restoring into an empty garden is the common case — new phone, reinstall — and
    // nothing is at stake, so don't dress it up as destructive.
    const body =
      plants.length === 0
        ? `This backup was taken on ${taken} and holds ${incoming}.${dropped}`
        : `This backup was taken on ${taken} and holds ${incoming}.\n\nYour current ${plants.length} plant${plants.length === 1 ? '' : 's'} will be replaced. This can't be undone.${dropped}`;

    Alert.alert(plants.length === 0 ? 'Restore your garden?' : 'Replace your garden?', body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: plants.length === 0 ? 'Restore' : 'Replace',
        style: plants.length === 0 ? 'default' : 'destructive',
        onPress: () => {
          replaceGarden({ plants: data.plants, log: data.log, profile: data.profile });
          Alert.alert('Restored', `${incoming} are back.`);
        },
      },
    ]);
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
      <Text style={styles.overline}>YOUR GARDEN</Text>
      <Text style={styles.title}>{userName ? `Hello, ${userName}.` : 'Hello.'}</Text>

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

      {/* ---------- Data ---------- */}
      <Text style={[styles.overline, styles.sectionGap]}>YOUR DATA</Text>
      <View style={styles.card}>
        <Pressable
          style={styles.row}
          onPress={onExport}
          disabled={exporting}
          accessibilityRole="button"
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Export your data</Text>
            <Text style={styles.rowHint}>
              Saves everything to a file you keep — a spreadsheet-friendly record, and a way
              back if you change phones. Juniper doesn&apos;t upload it; you choose where it goes.
            </Text>
          </View>
          {exporting ? <ActivityIndicator color={colors.inkFaint} /> : <Text style={styles.chevron}>→</Text>}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.row}
          onPress={onImport}
          disabled={importing}
          accessibilityRole="button"
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Import a previous export</Text>
            <Text style={styles.rowHint}>
              Takes a file Juniper exported and puts that garden back. It replaces what&apos;s
              here rather than merging, so you always know exactly what you have.
            </Text>
          </View>
          {importing ? <ActivityIndicator color={colors.inkFaint} /> : <Text style={styles.chevron}>→</Text>}
        </Pressable>
      </View>

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
        Tending {stats.plantCount} plant{stats.plantCount === 1 ? '' : 's'}.
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
  title: { ...text.displayItalic, fontSize: 32 },
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

  chevron: { ...text.hint, color: colors.inkFaint, fontSize: 16 },
  footnote: { ...text.hint, paddingHorizontal: spacing.xs },
  footer: { ...text.footer, textAlign: 'center', marginTop: spacing.section },
});
