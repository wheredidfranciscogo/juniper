/** Add plant — entry. Three large cards for the path selector. Stub for task #11. */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, text, radii } from '../../theme';
import { IconCamera, IconSearch, IconPencil, IconClose } from '../../components/icons';

const PATHS = [
  { v: 'photo', label: 'Identify by photo', hint: 'Snap a leaf, we’ll guess.', Icon: IconCamera },
  { v: 'search', label: 'Search by name', hint: 'If you already know what they are.', Icon: IconSearch },
  { v: 'manual', label: 'Add manually', hint: 'A blank tag, fill it in.', Icon: IconPencil },
] as const;

export default function AddIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => router.back()} style={styles.close} hitSlop={10}>
        <IconClose size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.overline}>WELCOME THE NEW ONE</Text>
      <Text style={styles.question}>
        How would you like to <Text style={styles.italic}>add</Text> them?
      </Text>
      <View style={styles.cards}>
        {PATHS.map(({ v, label, hint, Icon }) => (
          <Pressable
            key={v}
            onPress={() => router.push({ pathname: '/add/edit', params: { path: v } })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.cardIcon}>
              <Icon size={32} color={colors.moss} stroke={1.4} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardHint}>{hint}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.footer}>Don't worry about getting it right.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.page, gap: spacing.lg },
  close: {
    position: 'absolute',
    top: 12,
    left: spacing.page,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  overline: { ...text.overline, marginTop: 48 },
  question: { ...text.question },
  italic: { fontFamily: 'SourceSerif4_400Regular_Italic' },
  cards: { gap: 12, marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 22,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardPressed: { borderColor: colors.ink, backgroundColor: colors.surface2 },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardLabel: { ...text.rowName },
  cardHint: { ...text.hint },
  footer: { ...text.footer, marginTop: 'auto', marginBottom: 24, textAlign: 'center' },
});
