/**
 * LogFeed — day-grouped activity feed.
 * Used on the Log tab (full feed) and Plant Detail (filtered to one plant).
 */

import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, text } from '../theme';
import type { LogEntry } from '../data/types';
import { COLOR_BY_KIND, ICON_BY_KIND, groupLogByDay, timestampLabel } from '../lib/log-utils';

export interface LogFeedProps {
  log: LogEntry[];
  /** Show day-group headers (Today / Yesterday / ...). Hide on per-plant view. */
  showGroupHeaders?: boolean;
}

export function LogFeed({ log, showGroupHeaders = true }: LogFeedProps) {
  if (log.length === 0) {
    return <Text style={styles.empty}>No notes yet. Plants don't mind waiting.</Text>;
  }
  const groups = groupLogByDay(log);
  return (
    <View style={styles.root}>
      {groups.map((g) => (
        <View key={g.label} style={styles.group}>
          {showGroupHeaders && <Text style={styles.groupHeader}>{g.label.toUpperCase()}</Text>}
          {g.entries.map((e) => (
            <Row key={e.id} entry={e} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Row({ entry }: { entry: LogEntry }) {
  const Icon = ICON_BY_KIND[entry.kind];
  const color = COLOR_BY_KIND[entry.kind];
  return (
    <View style={styles.row}>
      <View style={styles.iconCol}>
        <Icon size={18} color={color} stroke={1.4} />
      </View>
      <View style={styles.body}>
        <Text style={styles.text}>{entry.text || '—'}</Text>
      </View>
      <Text style={styles.ts}>{timestampLabel(entry.when)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  group: { gap: 4 },
  groupHeader: { ...text.overlineMd, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  iconCol: { width: 22, alignItems: 'center', paddingTop: 1 },
  body: { flex: 1 },
  text: { fontFamily: fonts.serif.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  ts: { ...text.monoTimestamp, paddingTop: 3 },
  empty: { ...text.bodyMuted, fontFamily: fonts.sans.regularItalic, textAlign: 'center', paddingVertical: spacing.section },
});
