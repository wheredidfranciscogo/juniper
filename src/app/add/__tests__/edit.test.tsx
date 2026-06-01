import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mutable params + router so each test can drive the path variant.
let mockParams: { path?: string } = {};
const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
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
    expect(mockRouter.replace).not.toHaveBeenCalled();

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
    expect(added?.daysSinceWater).toBe(0);
    expect(added?.tendedDays).toBe(0);
    expect(added?.photos).toEqual([]);
    // The store also prepends a 'joined' log entry per addPlant().
    expect(store?.log[0]).toMatchObject({ plantId: added?.id, kind: 'joined' });
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/garden');
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
  it('shows the key-missing hint when EXPO_PUBLIC_PERENUAL_KEY is absent', () => {
    mockParams = { path: 'search' };
    render(withStore(<AddEdit />));
    expect(screen.getByText('BY NAME')).toBeTruthy();
    expect(screen.getByText(/Add EXPO_PUBLIC_PERENUAL_KEY to \.env/)).toBeTruthy();
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
