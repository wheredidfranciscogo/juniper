/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],

  // Jest's 5s default is comfortable locally and too tight on a shared CI runner. The
  // component suites mount a real StoreProvider and wait on its async AsyncStorage
  // hydration, and the FIRST test in each file also pays the cost of loading the whole
  // React Native module graph — which is what tipped the You suite over on GitHub
  // Actions while the same test ran in ~500ms locally.
  //
  // This is headroom for slow infrastructure, not for slow code: a genuinely hung test
  // still fails, just 15 seconds later.
  testTimeout: 15_000,
};
