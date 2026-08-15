/**
 * Bottom tab layout with custom tab bar.
 * 4 nav tabs (Today / Garden / Log / You) + a central clay FAB that pushes /add.
 * Per the handoff: 5 visual slots, the middle one is not a tab destination.
 */

import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, text } from '../../theme';
import { handleTabPress } from '../../lib/tab-press';
import {
  IconHome,
  IconGarden,
  IconJournal,
  IconLeaf,
  IconPlus,
  type IconProps,
} from '../../components/icons';

interface TabConfig {
  name: 'today' | 'garden' | 'log' | 'you';
  label: string;
  Icon: React.FC<IconProps>;
}

const TABS: TabConfig[] = [
  { name: 'today', label: 'today', Icon: IconHome },
  { name: 'garden', label: 'garden', Icon: IconGarden },
  { name: 'log', label: 'log', Icon: IconJournal },
  { name: 'you', label: 'you', Icon: IconLeaf },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  // Render order: [today, garden, FAB, log, you]
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const handlePress = (routeName: string) => handleTabPress(routeName, state, navigation);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      {left.map((t) => (
        <TabButton key={t.name} {...t} active={activeRoute === t.name} onPress={() => handlePress(t.name)} />
      ))}

      <Pressable
        onPress={() => router.push('/add')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        testID="tab-add"
        accessibilityRole="button"
        accessibilityLabel="Add a plant"
      >
        <IconPlus size={24} color={colors.paper} stroke={1.8} />
      </Pressable>

      {right.map((t) => (
        <TabButton key={t.name} {...t} active={activeRoute === t.name} onPress={() => handlePress(t.name)} />
      ))}
    </View>
  );
}

function TabButton({
  name,
  label,
  Icon,
  active,
  onPress,
}: TabConfig & { active: boolean; onPress: () => void }) {
  const tint = active ? colors.ink : colors.inkFaint;
  return (
    // testID so the Maestro flows can tap a tab by identity rather than by its label.
    // Matching on the visible text is fragile here: "today" also appears in the body
    // copy ("Last watered today."), so a text tap can hit the wrong element entirely.
    <Pressable
      onPress={onPress}
      style={styles.tabBtn}
      hitSlop={6}
      testID={`tab-${name}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={22} color={tint} stroke={1.5} />
      <Text style={[styles.tabLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      {/* index just redirects to /today — hide it from the tab bar. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="today" />
      <Tabs.Screen name="garden" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  tabLabel: { ...text.tabLabel, textTransform: 'lowercase', letterSpacing: 0.5 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    marginTop: -22,
    shadowColor: colors.clay,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { backgroundColor: colors.clayDeep, transform: [{ scale: 0.96 }] },
});
