// Global Jest setup for unit + component tests.

// Gesture Handler ships a Jest setup that stubs its native module.
import 'react-native-gesture-handler/jestSetup';

// Reanimated v4's bundled mock re-imports the real module, which tries to boot
// the native Worklets runtime and throws under Jest. Provide a self-contained
// mock that renders animated components as plain views and resolves animations
// synchronously — enough to exercise component logic without a native runtime.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, Image, ScrollView } = require('react-native');

  const animated = (Component: unknown) =>
    React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(Component as never, { ...props, ref } as never),
    );

  const Animated = {
    View: animated(View),
    Text: animated(Text),
    Image: animated(Image),
    ScrollView: animated(ScrollView),
    createAnimatedComponent: (c: unknown) => animated(c),
  };

  const passEasing = () => 0;

  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory: () => unknown) => {
      try {
        return factory();
      } catch {
        return {};
      }
    },
    useDerivedValue: (factory: () => unknown) => ({ value: factory() }),
    useAnimatedRef: () => ({ current: null }),
    withTiming: (toValue: unknown, _config?: unknown, cb?: (f: boolean) => void) => {
      cb?.(true);
      return toValue;
    },
    withSpring: (toValue: unknown, _config?: unknown, cb?: (f: boolean) => void) => {
      cb?.(true);
      return toValue;
    },
    withDelay: (_delay: number, value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values[values.length - 1],
    cancelAnimation: () => {},
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    runOnUI: (fn: (...args: unknown[]) => unknown) => fn,
    interpolate: (value: number) => value,
    interpolateColor: () => 'rgba(0, 0, 0, 1)',
    Easing: {
      bezier: () => passEasing,
      linear: passEasing,
      ease: passEasing,
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      inOut: (fn: unknown) => fn,
    },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  };
});

// Image picker is a native module — stub the four calls the app uses so the
// Add Plant form renders without booting native code.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: null })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: null })),
}));

// Haptics talks to a native module that doesn't exist under Jest.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
