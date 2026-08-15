/**
 * Route-gate test for the root layout.
 *
 * Mounts <RootStack> under <StoreProvider> with a mocked expo-router whose
 * Stack passes children through and whose Stack.Protected only renders its
 * children when `guard` is true. Each Stack.Screen renders an observable
 * marker. We then assert which screens are exposed before and after
 * completeOnboarding flips `onboarded`.
 *
 * This is the test that would have caught the "Unmatched Route after Begin"
 * regression: if Protected is removed or its guards are wired backwards,
 * the assertions below fail.
 */

import * as React from 'react';
import { Text } from 'react-native';
import { render, screen, act, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const ReactLib = require('react') as typeof import('react');
  const RN = require('react-native') as typeof import('react-native');

  const Stack: React.FC<{ children?: React.ReactNode }> & {
    Screen: React.FC<{ name: string; options?: unknown }>;
    Protected: React.FC<{ guard: boolean; children?: React.ReactNode }>;
  } = ({ children }) =>
    ReactLib.createElement(ReactLib.Fragment, null, children);

  Stack.Screen = ({ name }) =>
    ReactLib.createElement(RN.Text, null, `SCREEN:${name}`);

  Stack.Protected = ({ guard, children }) =>
    guard ? ReactLib.createElement(ReactLib.Fragment, null, children) : null;

  return { Stack };
});

import { RootStack } from '../../lib/root-stack';
import { StoreProvider, useStore } from '../../lib/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null;
function CaptureStore() {
  store = useStore();
  return null;
}

beforeEach(() => {
  store = null;
});

async function mount() {
  const result = render(
    <StoreProvider>
      <RootStack />
      <CaptureStore />
    </StoreProvider>,
  );
  // RootStack renders null until AsyncStorage hydration resolves.
  await waitFor(() => expect(store?.hydrated).toBe(true));
  return result;
}

const PRE_ONBOARDING = ['index', '(onboarding)'];
const POST_ONBOARDING = ['(tabs)', 'add', 'plant/[id]'];

describe('RootStack — onboarding gate', () => {
  it('exposes the onboarding routes and hides the app routes before completion', async () => {
    await mount();
    for (const name of PRE_ONBOARDING) {
      expect(screen.getByText(`SCREEN:${name}`)).toBeTruthy();
    }
    for (const name of POST_ONBOARDING) {
      expect(screen.queryByText(`SCREEN:${name}`)).toBeNull();
    }
  });

  it('swaps the route set when completeOnboarding flips the store flag', async () => {
    await mount();
    expect(screen.queryByText('SCREEN:(tabs)')).toBeNull();

    act(() => {
      store.completeOnboarding({ userName: 'June', archetype: 'whisperer', seed: true });
    });

    for (const name of PRE_ONBOARDING) {
      expect(screen.queryByText(`SCREEN:${name}`)).toBeNull();
    }
    for (const name of POST_ONBOARDING) {
      expect(screen.getByText(`SCREEN:${name}`)).toBeTruthy();
    }
  });

  it('does not depend on imperative router calls — the navigator is driven entirely by guard state', async () => {
    // Sanity: if a future refactor reverts to <Stack /> with auto-detection
    // (no Stack.Protected), both sets would be visible simultaneously and
    // this assertion would fail.
    await mount();
    const exposed = PRE_ONBOARDING.filter((n) => screen.queryByText(`SCREEN:${n}`));
    const hidden = POST_ONBOARDING.filter((n) => screen.queryByText(`SCREEN:${n}`));
    expect(exposed).toHaveLength(PRE_ONBOARDING.length);
    expect(hidden).toHaveLength(0);
  });
});

// Suppress the unused-Text warning when the import gets tree-shaken.
void Text;
