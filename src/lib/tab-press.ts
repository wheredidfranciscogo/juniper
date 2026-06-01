/**
 * Pure handler for a bottom-tab press. Extracted from (tabs)/_layout's
 * CustomTabBar so the behaviour can be unit-tested without booting the
 * whole tab navigator.
 *
 * React Navigation matches tab events by `route.key` (a unique id), not
 * by `route.name` — emitting with `target: name` leaves the event
 * unhandled and produces a confusing "NAVIGATE not handled" warning at
 * runtime. We also short-circuit when the pressed tab is already active.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export type TabPressState = BottomTabBarProps['state'];
export type TabPressNavigation = BottomTabBarProps['navigation'];

export function handleTabPress(
  routeName: string,
  state: TabPressState,
  navigation: TabPressNavigation,
): void {
  const route = state.routes.find((r) => r.name === routeName);
  if (!route) return;

  const event = navigation.emit({
    type: 'tabPress',
    target: route.key,
    canPreventDefault: true,
  });

  const alreadyActive = state.routes[state.index]?.key === route.key;
  if (!alreadyActive && !event.defaultPrevented) {
    // The navigate call is intentionally typed loosely — Bottom Tab's typed
    // navigate signature uses the navigator's typed route map, and we only
    // know the route by structural data here.
    (navigation.navigate as unknown as (n: string, p?: object) => void)(
      route.name,
      route.params,
    );
  }
}
