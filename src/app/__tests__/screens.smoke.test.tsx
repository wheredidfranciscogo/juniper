/**
 * Smoke tests for every screen in the app — broad, cheap regression net.
 *
 * Each test just mounts a screen under <StoreProvider> with mocked
 * navigation hooks and asserts a stable piece of on-screen text. The
 * value isn't in the assertions; it's in the fact that any broken
 * import, missing prop, hook-outside-provider error, or runtime-only
 * TypeScript hole would surface as a failed render here.
 */

import * as React from 'react';
import { render, screen, act } from '@testing-library/react-native';

// Per-test-mutable router + params so individual cases can drive them.
const mockParams: { id?: string } = {};
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
  canGoBack: () => true,
  canDismiss: () => false,
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  dismissTo: jest.fn(),
  prefetch: jest.fn(),
  reload: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import Splash from '../index';
import Today from '../(tabs)/today';
import Garden from '../(tabs)/garden';
import Log from '../(tabs)/log';
import You from '../(tabs)/you';
import PlantDetail from '../plant/[id]';
import { StoreProvider, useStore } from '../../lib/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storeRef: any = null;
function Capture() {
  storeRef = useStore();
  return null;
}

beforeEach(() => {
  storeRef = null;
  mockParams.id = undefined;
  Object.values(mockRouter).forEach((v) => {
    if (typeof v === 'function' && 'mockClear' in v) (v as jest.Mock).mockClear();
  });
});

function renderScreen(component: React.ReactElement, opts: { seed?: boolean } = {}) {
  const result = render(
    <StoreProvider>
      <Capture />
      {component}
    </StoreProvider>,
  );
  if (opts.seed) {
    act(() => {
      storeRef.completeOnboarding({
        userName: 'June',
        archetype: 'whisperer',
        seed: true,
      });
    });
  }
  return result;
}

describe('Splash', () => {
  it('renders the entry hint', () => {
    renderScreen(<Splash />);
    expect(screen.getByText('tap anywhere to begin')).toBeTruthy();
  });
});

describe('Today', () => {
  it('renders the empty state when no plants are tended', () => {
    renderScreen(<Today />);
    expect(screen.getByText('Nothing to water today.')).toBeTruthy();
  });

  it('renders the thirsty card for a seeded plant', () => {
    renderScreen(<Today />, { seed: true });
    // Marcel is seeded with daysSinceWater: 8, waterEvery: 7 -> thirsty.
    expect(screen.getByText('Water Marcel')).toBeTruthy();
  });
});

describe('Garden', () => {
  it('renders the empty state with no plants', () => {
    renderScreen(<Garden />);
    expect(screen.getByText('Nothing here yet.')).toBeTruthy();
  });

  it('renders the title and a seeded plant', () => {
    renderScreen(<Garden />, { seed: true });
    expect(screen.getByText('The Garden')).toBeTruthy();
    expect(screen.getByText('Marcel')).toBeTruthy();
  });
});

describe('Log', () => {
  it('renders the section title', () => {
    renderScreen(<Log />);
    expect(screen.getByText('The Log')).toBeTruthy();
  });
});

describe('You', () => {
  it('renders the default archetype copy', () => {
    renderScreen(<You />);
    // Default archetype in initialState is 'whisperer'.
    expect(screen.getByText('The Plant Whisperer')).toBeTruthy();
  });
});

describe('PlantDetail', () => {
  it('renders the not-found state when the id matches no plant', () => {
    mockParams.id = 'ghost';
    renderScreen(<PlantDetail />);
    expect(screen.getByText('Plant not found.')).toBeTruthy();
  });

  it('renders the plant when the id matches a seeded plant', () => {
    mockParams.id = 'marcel';
    renderScreen(<PlantDetail />, { seed: true });
    expect(screen.getByText('Marcel')).toBeTruthy();
    expect(screen.getAllByText('Monstera deliciosa').length).toBeGreaterThan(0);
  });
});
