import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mutable params + router + redirect tracker so each test can drive the path variant.
let mockParams: { path?: string; id?: string } = {};
const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() };
let lastRedirectHref: string | null = null;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
  Redirect: (props: { href: string }) => {
    lastRedirectHref = props.href;
    return null;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import AddEdit from '../edit';
import { StoreProvider, useStore } from '../../../lib/store';
import type { Plant } from '../../../data/types';

type Store = ReturnType<typeof useStore>;

function withStore(children: React.ReactNode, onReady?: (s: Store) => void) {
  function Capture() {
    const s = useStore();
    React.useEffect(() => {
      onReady?.(s);
    });
    return null;
  }
  return (
    <StoreProvider>
      {children}
      <Capture />
    </StoreProvider>
  );
}

beforeEach(() => {
  mockParams = {};
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
  lastRedirectHref = null;
  delete process.env.EXPO_PUBLIC_PERENUAL_KEY;
});

describe('AddEdit — manual path', () => {
  it('defaults to the manual variant and renders core fields', () => {
    render(withStore(<AddEdit />));
    expect(screen.getByText('BY HAND')).toBeTruthy();
    expect(screen.getByPlaceholderText('Marcel')).toBeTruthy();
    expect(screen.getByPlaceholderText('Monstera deliciosa')).toBeTruthy();
    expect(screen.getByPlaceholderText('optional')).toBeTruthy();
    // Photo and Search blocks should not appear on the manual path.
    expect(screen.queryByText('A LIKENESS')).toBeNull();
    expect(screen.queryByText('FIND THEIR NAME')).toBeNull();
  });

  it('does not call addPlant while name or species are blank', () => {
    // TS narrows `let`s captured in closures awkwardly here; `any` keeps the test readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null;
    render(withStore(<AddEdit />, (s) => (store = s)));
    fireEvent.press(screen.getByText('Save'));
    expect(store?.plants).toEqual([]);
    expect(lastRedirectHref).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('Marcel'), 'Fernando');
    fireEvent.press(screen.getByText('Save'));
    expect(store?.plants).toEqual([]); // species still blank
  });

  it('adds a plant and routes to garden once name + species are filled', () => {
    // TS narrows `let`s captured in closures awkwardly here; `any` keeps the test readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null;
    render(withStore(<AddEdit />, (s) => (store = s)));
    fireEvent.changeText(screen.getByPlaceholderText('Marcel'), '  Fernando  ');
    fireEvent.changeText(screen.getByPlaceholderText('Monstera deliciosa'), 'Nephrolepis exaltata');
    fireEvent.press(screen.getByText('Save'));

    const added = store?.plants.find((p: Plant) => p.name === 'Fernando');
    expect(added).toBeTruthy();
    expect(added?.species).toBe('Nephrolepis exaltata');
    // A new plant counts as watered now, so its first reminder is a full cadence away.
    expect(Date.now() - Date.parse(added!.lastWateredISO)).toBeLessThan(5_000);
    expect(added?.photos).toEqual([]);
    // The store also prepends a 'joined' log entry per addPlant().
    expect(store?.log[0]).toMatchObject({ plantId: added?.id, kind: 'joined' });
    expect(lastRedirectHref).toBe('/garden');
  });

  it('steps the water cadence and reflects singular/plural copy', () => {
    render(withStore(<AddEdit />));
    expect(screen.getByText('Water every 7 days')).toBeTruthy();
    // Tap decrement six times: 7 -> 1
    const dec = screen.getByLabelText('decrement');
    for (let i = 0; i < 6; i++) fireEvent.press(dec);
    expect(screen.getByText('Water every 1 day')).toBeTruthy();
    // Min clamped at 1.
    fireEvent.press(dec);
    expect(screen.getByText('Water every 1 day')).toBeTruthy();
  });
});

describe('AddEdit — search path', () => {
  it('tells the user search is unavailable without naming an environment variable', () => {
    mockParams = { path: 'search' };
    render(withStore(<AddEdit />));
    expect(screen.getByText('BY NAME')).toBeTruthy();
    // Developer text must never reach a shipping screen.
    expect(screen.getByText(/Species search isn't available yet/)).toBeTruthy();
    expect(screen.queryByText(/EXPO_PUBLIC|\.env/)).toBeNull();
  });
});

describe('AddEdit — photo path', () => {
  it('renders the photo block with capture buttons', () => {
    mockParams = { path: 'photo' };
    render(withStore(<AddEdit />));
    expect(screen.getByText('FROM A PHOTO')).toBeTruthy();
    expect(screen.getByText('A LIKENESS')).toBeTruthy();
    expect(screen.getByText('Take photo')).toBeTruthy();
    expect(screen.getByText('From library')).toBeTruthy();
  });
});

describe('AddEdit — edit path (id param)', () => {
  const MARCEL: Plant = {
    id: 'marcel',
    name: 'Marcel',
    species: 'Monstera deliciosa',
    nickname: 'The dramatic one',
    pressing: 'moss',
    icon: 'monstera',
    waterEvery: 7,
    lastWateredISO: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    light: 'bright indirect',
    addedISO: '2025-09-17',
    photos: [],
    journal: [],
  };

  /**
   * Mounts AddEdit under a StoreProvider that's been seeded with the given
   * plants. The inner wrapper holds AddEdit's mount until the seed has
   * actually landed in the store — otherwise AddEdit's useState initialisers
   * run with the empty store and the form never pre-fills.
   */
  function renderWithPlants(plants: Plant[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let store: any = null;
    function SeedAndMount() {
      const s = useStore();
      store = s;
      const seeded = plants.every((target) => s.plants.some((p: Plant) => p.id === target.id));
      React.useEffect(() => {
        if (seeded) return;
        for (const plant of plants) {
          if (!s.plants.some((p: Plant) => p.id === plant.id)) s.addPlant(plant);
        }
      }, [seeded, s]);
      if (!seeded) return null;
      return <AddEdit />;
    }
    const result = render(
      <StoreProvider>
        <SeedAndMount />
      </StoreProvider>,
    );
    return { ...result, getStore: () => store };
  }

  it('pre-fills the form with the matching plant', () => {
    mockParams = { id: 'marcel' };
    renderWithPlants([MARCEL]);

    expect(screen.getByText('EDITING')).toBeTruthy();
    expect(screen.getByDisplayValue('Marcel')).toBeTruthy();
    expect(screen.getByDisplayValue('Monstera deliciosa')).toBeTruthy();
    expect(screen.getByDisplayValue('The dramatic one')).toBeTruthy();
    expect(screen.getByText('Water every 7 days')).toBeTruthy();
  });

  it('saves via updatePlant and preserves untouched fields', () => {
    mockParams = { id: 'marcel' };
    const { getStore } = renderWithPlants([MARCEL]);

    fireEvent.changeText(screen.getByDisplayValue('Marcel'), 'Marcel II');
    fireEvent.press(screen.getByText('Save'));

    const updated = getStore().plants.find((p: Plant) => p.id === 'marcel');
    expect(updated.name).toBe('Marcel II');
    // Untouched fields preserved.
    expect(updated.lastWateredISO).toBe(MARCEL.lastWateredISO);
    expect(updated.addedISO).toBe('2025-09-17');
    expect(lastRedirectHref).toBe('/garden');
  });

  it('redirects to /garden when the id refers to no existing plant', () => {
    mockParams = { id: 'ghost' };
    render(withStore(<AddEdit />));
    expect(lastRedirectHref).toBe('/garden');
  });

  it('does not show the photo or search blocks while editing, even with path=photo', () => {
    mockParams = { id: 'marcel', path: 'photo' };
    renderWithPlants([MARCEL]);

    expect(screen.queryByText('A LIKENESS')).toBeNull();
    expect(screen.queryByText('FIND THEIR NAME')).toBeNull();
    expect(screen.getByText('EDITING')).toBeTruthy();
  });
});
