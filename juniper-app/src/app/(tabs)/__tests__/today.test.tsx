/**
 * Today screen — the watering interaction.
 *
 * The bug this pins: thirst is derived from the store, so the moment `waterPlant`
 * lands the plant stops being thirsty and its card would drop out of the list —
 * unmounting mid-tap, before the ripple, the clay-to-moss crossfade, or the
 * "Watered, Tuesday." label ever appeared. The handoff calls that animation the moment
 * of delight, and it was never once visible.
 */

import * as React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';

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

import Today from '../today';
import { StoreProvider, useStore } from '../../../lib/store';
import type { Plant } from '../../../data/types';

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'marcel',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: new Date(Date.now() - 8 * 86_400_000).toISOString(), // thirsty
  light: 'bright indirect',
  temp: 'warm',
  addedISO: new Date(Date.now() - 100 * 86_400_000).toISOString(),
  photos: [],
  journal: [],
  ...over,
});

function Seed({ plants }: { plants: Plant[] }) {
  const { addPlant, completeOnboarding, hydrated } = useStore();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    completeOnboarding({ userName: 'June', archetype: 'whisperer', seed: false });
    plants.forEach(addPlant);
  }, [hydrated, addPlant, completeOnboarding, plants]);
  return null;
}

const mount = async (plants: Plant[]) => {
  render(
    <StoreProvider>
      <Seed plants={plants} />
      <Today />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByText(/Good|Late night/)).toBeTruthy());
};

describe('Today — watering', () => {
  it('shows a thirsty plant with its water button', async () => {
    await mount([plant()]);
    await waitFor(() => expect(screen.getByText('Water Marcel')).toBeTruthy());
    expect(screen.getByText('THIRSTY')).toBeTruthy();
  });

  it('keeps the card on screen after watering so the animation can finish', async () => {
    await mount([plant()]);
    const button = await screen.findByText('Water Marcel');

    await act(async () => {
      fireEvent.press(button);
    });

    // The card must survive the plant ceasing to be thirsty. If this regresses, the
    // signature interaction is invisible: tap, and the card vanishes underneath you.
    await waitFor(() => expect(screen.getByText('WATERED')).toBeTruthy());
    expect(screen.getByText('Last watered today.')).toBeTruthy();
  });

  it('does not also list the watered plant under Upcoming', async () => {
    await mount([plant()]);
    const button = await screen.findByText('Water Marcel');

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => expect(screen.getByText('WATERED')).toBeTruthy());
    // It stays in the thirsty row for this visit, so it must not appear twice.
    expect(screen.queryAllByText('Marcel')).toHaveLength(1);
  });

  it('shows the empty state when nothing is due', async () => {
    await mount([plant({ lastWateredISO: new Date().toISOString() })]);
    await waitFor(() => expect(screen.getByText('Nothing to water today.')).toBeTruthy());
  });
});
