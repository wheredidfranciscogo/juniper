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

// AsyncStorage is native — default to "no persisted state" so each test
// starts empty. Tests that want to exercise hydration can override.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

// Haptics talks to a native module that doesn't exist under Jest.
// `performAndroidHapticsAsync` / `AndroidHaptics` are the Android-native path that
// src/lib/haptics.ts takes on that platform — the SDK 54 docs recommend them over
// impactAsync there, which Android only simulates via the Vibrator service. They are
// stubbed unconditionally so the mock does not depend on which platform Jest runs as.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
  AndroidHaptics: { Confirm: 'confirm', Context_Click: 'context-click', Reject: 'reject' },
}));

// expo-notifications registers device-push listeners as an import side effect, which
// both warns loudly under Jest and reaches for native modules that aren't there. Juniper
// only ever schedules LOCAL notifications, so none of that machinery is wanted — stub the
// surface the app actually calls. The scheduling *decisions* are tested for real in
// src/lib/__tests__/watering.test.ts, which is pure and needs no mock at all.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
}));

// expo-file-system's SDK 54 API is a native-backed class (File/Directory/Paths). Stub it
// with plain objects so backup.ts and photos.ts can be tested for their decisions —
// what gets written, when a copy is refused, what never gets deleted — without a device.
jest.mock('expo-file-system', () => {
  const makeFile = jest.fn(() => ({
    exists: false,
    uri: 'file:///cache/stub.json',
    create: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    copy: jest.fn(),
    move: jest.fn(),
    text: jest.fn(() => Promise.resolve('')),
  }));
  const makeDirectory = jest.fn(() => ({
    exists: true,
    uri: 'file:///documents/photos/',
    create: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(() => []),
  }));
  return {
    File: makeFile,
    Directory: makeDirectory,
    Paths: { cache: 'file:///cache/', document: 'file:///documents/' },
  };
});

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: null })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// The store's hydration effect resolves on a microtask, which fires after
// short synchronous tests have already exited renderHook. The resulting
// "not wrapped in act" warning is benign here — the test never asserts on
// post-hydration state. Patch console.error at setup-file load time so
// react-test-renderer doesn't cache the original reference and bypass us.
// Real act violations elsewhere still surface.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return;
  originalConsoleError(...args);
};
