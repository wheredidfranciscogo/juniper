import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, text } from '../../theme';
import { useStore } from '../../lib/store';
import { LogFeed } from '../../components/LogFeed';

export default function Log() {
  const insets = useSafeAreaInsets();
  const { log } = useStore();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + spacing.section, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.overline}>A SLOW RECORD</Text>
        <Text style={styles.title}>The Log</Text>
      </View>
      <LogFeed log={log} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: spacing.page, gap: spacing.lg },
  header: { gap: spacing.base },
  overline: text.overline,
  title: text.sectionTitle,
});
