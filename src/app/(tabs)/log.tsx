import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, text } from '../../theme';
import { useStore } from '../../lib/store';

export default function Log() {
  const insets = useSafeAreaInsets();
  const { log } = useStore();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.section }]}>
      <Text style={styles.overline}>A SLOW RECORD</Text>
      <Text style={styles.title}>The Log</Text>
      <Text style={styles.body}>{log.length} entries so far. Full feed in the next task.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.page, gap: spacing.base },
  overline: text.overline,
  title: text.sectionTitle,
  body: { ...text.bodyMuted, marginTop: 8 },
});
