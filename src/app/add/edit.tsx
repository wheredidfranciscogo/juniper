/** Combined add-plant edit page — stub. Full form lands in task #11. */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, text, radii } from '../../theme';

const PATH_LABEL: Record<string, string> = {
  photo: 'FROM A PHOTO',
  search: 'BY NAME',
  manual: 'BY HAND',
};

export default function AddEdit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { path } = useLocalSearchParams<{ path?: string }>();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.overline}>{PATH_LABEL[path ?? 'manual']}</Text>
        <Pressable hitSlop={10}>
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>The full form lives here.</Text>
        <Text style={styles.hint}>Lands in the next task.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  overline: { ...text.overline },
  cancel: { ...text.ghostButton, color: colors.inkMuted },
  save: { ...text.ghostButton, color: colors.clay },
  body: { padding: spacing.page, gap: spacing.sm },
  title: text.sectionTitle,
  hint: { ...text.hint, marginTop: spacing.sm },
  italic: { fontStyle: 'italic' },
  unused: { borderRadius: radii.md },
});
