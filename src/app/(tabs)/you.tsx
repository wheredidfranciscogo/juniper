import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, text } from '../../theme';
import { ARCHETYPES } from '../../data/seed';
import { useStore } from '../../lib/store';

export default function You() {
  const insets = useSafeAreaInsets();
  const { userName, archetype, plants } = useStore();
  const a = ARCHETYPES[archetype];
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.section }]}>
      <Text style={styles.overline}>YOU ARE</Text>
      <Text style={styles.title}>{a.name}</Text>
      <Text style={styles.body}>{a.body}</Text>
      <Text style={styles.hint}>Tending {plants.length} plant{plants.length === 1 ? '' : 's'} as {userName || 'friend'}.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.page, gap: spacing.base },
  overline: text.overline,
  title: { ...text.archetypeTitle, fontSize: 32 },
  body: text.blurb,
  hint: { ...text.hint, marginTop: spacing.base },
});
