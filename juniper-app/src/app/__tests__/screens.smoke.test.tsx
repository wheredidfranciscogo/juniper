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
      storeRef.completeOnboarding({ userName: 'June', seed: true });
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

describe('Garden', () => {
  it('renders the empty state with no plants', () => {
    renderScreen(<Garden />);
    expect(screen.getByText('No plants yet. Add your first with the button below.')).toBeTruthy();
  });

  it('renders a tile for a seeded plant', () => {
    renderScreen(<Garden />, { seed: true });
    expect(screen.getByText('Marcel')).toBeTruthy();
    // The count line is the screen's stable identity now that the grid replaced the
    // "The Garden" title; the other header line is a time-of-day greeting.
    expect(screen.getByText(/plant(s)? in your care/)).toBeTruthy();
  });
});

describe('Log', () => {
  it('renders the empty-state copy when no entries have been recorded', () => {
    renderScreen(<Log />);
    expect(screen.getByText('The Log')).toBeTruthy();
    expect(screen.getByText("No notes yet. Plants don't mind waiting.")).toBeTruthy();
  });

  it('renders the seeded feed entries via LogFeed', () => {
    renderScreen(<Log />, { seed: true });
    expect(screen.getByText('The Log')).toBeTruthy();
    // completeOnboarding(seed: true) prepends one "joined" entry per seeded plant.
    expect(screen.getByText('Marcel joined you.')).toBeTruthy();
  });
});

describe('You', () => {
  it('greets rather than assigning a personality', () => {
    renderScreen(<You />);
    expect(screen.getByText('YOUR GARDEN')).toBeTruthy();
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
