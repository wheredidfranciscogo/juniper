import type { LogEntry, LogKind } from '../data/types';
import {
  IconDrop,
  IconCactus,
  IconSparkle,
  IconWindow,
  IconPencil,
  IconSeedling,
  IconLeaf,
  type IconProps,
} from '../components/icons';
import { colors } from '../theme';

export const ICON_BY_KIND: Record<LogKind, React.FC<IconProps>> = {
  water: IconDrop,
  repot: IconCactus,
  fertilize: IconSparkle,
  move: IconWindow,
  note: IconPencil,
  joined: IconSeedling,
  observed: IconLeaf,
};

export const COLOR_BY_KIND: Record<LogKind, string> = {
  water: colors.moss,
  repot: colors.clay,
  fertilize: colors.moss,
  move: colors.inkMuted,
  note: colors.inkMuted,
  joined: colors.moss,
  observed: colors.moss,
};

const SHORT_WEEKDAY: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/** Human-friendly day bucket for a log entry. */
export function groupLabel(when: string, now = new Date()): string {
  const d = new Date(when);
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - entryDay.getTime()) / dayMs);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return SHORT_WEEKDAY[d.getDay()];
  if (diff < 30) return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Mono timestamp readout — "just now", "3h ago", "10:42". */
export function timestampLabel(when: string, now = new Date()): string {
  const d = new Date(when);
  const min = Math.round((now.getTime() - d.getTime()) / 60000);
  if (min < 2) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 6) return `${hr}h ago`;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export interface LogGroup {
  label: string;
  entries: LogEntry[];
}

export function groupLogByDay(log: LogEntry[]): LogGroup[] {
  const groups: LogGroup[] = [];
  for (const entry of log) {
    const label = groupLabel(entry.when);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}
