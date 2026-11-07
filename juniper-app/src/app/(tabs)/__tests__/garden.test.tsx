/**
 * The Garden grid is the app's home and the only place most watering will happen, so
 * these tests cover the things that would quietly break the glance it exists for:
 * watering from a square actually moving the store, the order not shuffling, the
 * squares saying their state in words as well as colour, and the peek opening and
 * handing off to the full record.
 *
 * Colour itself is not asserted — Reanimated is mocked to a plain View and
 * `interpolateColor` returns a constant under Jest (see jest-setup.ts). What IS
 * asserted is the number the colour is derived from, which is tested exhaustively and
 * purely in src/lib/__tests__/dryness.test.ts.
 */

import * as React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react-native';

import Garden from '../garden';
import { StoreProvider, useStore } from '../../../lib/store';
import type { Plant } from '../../../data/types';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'marcel',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: daysAgo(8), // due
  light: 'bright indirect',
  addedISO: daysAgo(300),
  photos: [],
  journal: [],
  ...over,
});

/**
 * Seeds once and never again. A harness that re-adds its plants on every render would
 * fight anything that removes or mutates one, and would make a watering test pass by
 * putting the original plant back.
 */
function Seed({ plants }: { plants: Plant[] }) {
  const { addPlant, completeOnboarding, hydrated } = useStore();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    completeOnboarding({ userName: 'June', seed: false });
    plants.forEach(addPlant);
  }, [hydrated, addPlant, completeOnboarding, plants]);
  return null;
}

const mount = async (plants: Plant[] = [plant()]) => {
  const view = render(
    <StoreProvider>
      <Seed plants={plants} />
      <Garden />
    </StoreProvider>,
  );
  // Wait for the first seeded square, not for the count line: the empty state renders
  // "0 plants in your care", which satisfies that pattern before the store has
  // hydrated and every assertion afterwards then runs against an empty garden.
  await waitFor(() => expect(screen.getByTestId(`tile-${plants[0].id}`)).toBeTruthy());
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Garden grid', () => {
  it('gives every plant a square', async () => {
    await mount([
      plant({ id: 'a', name: 'Marcel' }),
      plant({ id: 'b', name: 'Fernando' }),
    ]);
    expect(screen.getByTestId('tile-a')).toBeTruthy();
    expect(screen.getByTestId('tile-b')).toBeTruthy();
    expect(screen.getByText('Marcel')).toBeTruthy();
    expect(screen.getByText('Fernando')).toBeTruthy();
  });

  it('greets you by the name onboarding collected', async () => {
    await mount();
    expect(screen.getByText(/, June$/)).toBeTruthy();
  });

  it('counts what is ready for water without passing judgement on it', async () => {
    await mount([
      plant({ id: 'a', name: 'Due', lastWateredISO: daysAgo(9) }),
      plant({ id: 'b', name: 'Fresh', lastWateredISO: daysAgo(0) }),
    ]);
    expect(screen.getByText('2 plants in your care · 1 ready for water')).toBeTruthy();
  });

  it('drops the clause entirely when nothing needs water', async () => {
    await mount([plant({ lastWateredISO: daysAgo(1) })]);
    expect(screen.getByText('1 plant in your care')).toBeTruthy();
    expect(screen.queryByText(/ready for water/)).toBeNull();
  });

  // Colour is the grid's only visual signal, which is no signal at all to a screen
  // reader or a colourblind user. Every square must also say where it stands.
  it('states each square in words, not only in colour', async () => {
    await mount([
      plant({ id: 'a', name: 'Due', lastWateredISO: daysAgo(8) }),
      plant({ id: 'b', name: 'Soon', lastWateredISO: daysAgo(6) }),
      plant({ id: 'c', name: 'Fresh', lastWateredISO: daysAgo(2) }),
    ]);
    expect(screen.getByLabelText('Due, due for water')).toBeTruthy();
    expect(screen.getByLabelText('Soon, due tomorrow')).toBeTruthy();
    expect(screen.getByLabelText('Fresh, 5 days to go')).toBeTruthy();
  });

  it('orders the thirstiest first', async () => {
    await mount([
      plant({ id: 'fresh', name: 'Fresh', lastWateredISO: daysAgo(0) }),
      plant({ id: 'due', name: 'Due', lastWateredISO: daysAgo(8) }),
      plant({ id: 'mid', name: 'Mid', lastWateredISO: daysAgo(4) }),
    ]);
    const names = screen.getAllByText(/^(Fresh|Due|Mid)$/).map((n) => n.props.children);
    expect(names).toEqual(['Due', 'Mid', 'Fresh']);
  });
});

describe('watering from a square', () => {
  it('waters without opening the plant', async () => {
    await mount();
    expect(screen.getByText('1 plant in your care · 1 ready for water')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('tile-water-marcel'));
    });

    // The count line is derived from the stored timestamp, so this only changes if the
    // store actually moved — not if the tile merely restyled itself.
    await waitFor(() => expect(screen.getByText('1 plant in your care')).toBeTruthy());
    expect(screen.queryByText(/ready for water/)).toBeNull();
    // And it did not navigate anywhere.
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('turns the drop into a tick and refuses further taps once watered today', async () => {
    await mount([plant({ lastWateredISO: daysAgo(0) })]);
    const button = screen.getByTestId('tile-water-marcel');
    expect(button.props.accessibilityLabel).toBe('Marcel was watered today');
    expect(button.props.accessibilityState.disabled).toBe(true);

    // The tick is not an action, so the tap falls through to the square and opens the
    // plant — which is fine. What must NOT happen is a second watering being recorded.
    await act(async () => {
      fireEvent.press(button);
    });
    expect(screen.getByTestId('tile-water-marcel').props.accessibilityState.disabled).toBe(
      true,
    );
  });
});

describe('the peek', () => {
  it('opens when a square is tapped, and is not there before', async () => {
    await mount();
    expect(screen.queryByTestId('plant-peek')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('tile-marcel'));
    });

    // Scoped to the peek: the species also appears on the tile's own pressing
    // illustration behind it.
    const peek = within(screen.getByTestId('plant-peek'));
    expect(peek.getByText('Marcel')).toBeTruthy();
    expect(peek.getByText('Due for water')).toBeTruthy();
    expect(peek.getByTestId('peek-record')).toBeTruthy();
  });

  it('hands off to the full record rather than replacing it', async () => {
    await mount();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tile-marcel'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('peek-record'));
    });
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/plant/[id]',
      params: { id: 'marcel' },
    });
  });

  it('can water from inside the peek too', async () => {
    await mount();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tile-marcel'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('peek-water'));
    });
    await waitFor(() => expect(screen.getByText('Watered today')).toBeTruthy());
  });

  it('closes on the scrim', async () => {
    jest.useFakeTimers();
    try {
      await mount();
      await act(async () => {
        fireEvent.press(screen.getByTestId('tile-marcel'));
      });
      expect(screen.getByTestId('plant-peek')).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByTestId('peek-scrim'));
      });
      // The card unmounts after its close animation, not from the worklet callback.
      await act(async () => {
        jest.runAllTimers();
      });
      expect(screen.queryByTestId('plant-peek')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('an empty garden', () => {
  it('says what to do rather than looking broken', async () => {
    render(
      <StoreProvider>
        <Garden />
      </StoreProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByText('No plants yet. Add your first with the button below.'),
      ).toBeTruthy(),
    );
  });
});
