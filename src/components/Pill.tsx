import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, text } from '../theme';

export type PillTone = 'dried' | 'moss' | 'ink' | 'muted';

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  dried: { bg: 'transparent', fg: colors.dried },
  moss: { bg: 'transparent', fg: colors.moss },
  ink: { bg: 'transparent', fg: colors.ink },
  muted: { bg: 'transparent', fg: colors.inkMuted },
};

export function Pill({ tone, children }: { tone: PillTone; children: string }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.fg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: text.pill,
});
