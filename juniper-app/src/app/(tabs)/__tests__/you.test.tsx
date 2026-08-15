/**
 * The You screen is the only surface that can switch reminders on, so these tests
 * cover the states where getting it wrong is worst: claiming reminders are on when
 * the OS will never deliver one, and losing the permission-denied signal.
 */

import * as React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import You from '../you';
import { StoreProvider, useStore } from '../../../lib/store';
import type { Plant } from '../../../data/types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'marcel',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  light: 'bright indirect',
  temp: 'warm',
  addedISO: new Date(Date.now() - 100 * 86_400_000).toISOString(),
  photos: [],
  journal: [],
  ...over,
});

/** Mounts You under a real store, optionally seeded with plants. */
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

const mount = async (plants: Plant[] = [plant()]) => {
  const view = render(
    <StoreProvider>
      <Seed plants={plants} />
      <You />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByText('YOU ARE')).toBeTruthy());
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();

  // A stateful stand-in rather than a stub that always returns null. setReminder writes
  // the preference and then syncReminders reads it straight back, so a write-only mock
  // makes the queue look empty and hides whether scheduling actually happened.
  const store = new Map<string, string>();
  mockStorage.getItem.mockImplementation(async (k: string) => store.get(k) ?? null);
  mockStorage.setItem.mockImplementation(async (k: string, v: string) => {
    store.set(k, v);
  });
  mockNotifications.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as never);
  mockNotifications.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
});

describe('You — identity and stats', () => {
  it('shows the archetype and the garden stats', async () => {
    await mount([plant()]);
    expect(screen.getByText('The Plant Whisperer')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('1 plant')).toBeTruthy());
    expect(screen.getByText('IN YOUR CARE')).toBeTruthy();
    expect(screen.getByText('PLANT-DAYS')).toBeTruthy();
  });

  it('does not crash on an empty garden', async () => {
    await mount([]);
    await waitFor(() => expect(screen.getByText('0 plants')).toBeTruthy());
  });
});

describe('You — reminders', () => {
  it('starts off, and says so plainly', async () => {
    await mount();
    await waitFor(() => expect(screen.getByText(/Off\. Juniper will keep the record/)).toBeTruthy());
  });

  it('turning it on persists the preference and schedules the queue', async () => {
    await mount();
    const toggle = await screen.findByRole('switch');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(() => {
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        '@juniper/reminders',
        expect.stringContaining('"enabled":true'),
      );
    });
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('reverts the toggle and surfaces guidance when permission is refused', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as never);
    mockNotifications.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);

    await mount();
    const toggle = await screen.findByRole('switch');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    // The worst outcome would be a switch that reads "on" while nothing will ever fire.
    await waitFor(() => expect(screen.getByText(/turned off for Juniper/)).toBeTruthy());
    expect(toggle.props.value).toBe(false);
  });

  it('shows the toggle as off when the pref says on but permission was revoked', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify({ enabled: true, time: '09:00' }));
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as never);

    await mount();

    const toggle = await screen.findByRole('switch');
    await waitFor(() => expect(toggle.props.value).toBe(false));
    expect(screen.getByText(/turned off for Juniper/)).toBeTruthy();
  });

  it('offers times in plain language once enabled', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify({ enabled: true, time: '09:00' }));
    await mount();

    await waitFor(() => expect(screen.getByText('9am')).toBeTruthy());
    expect(screen.getByText('8pm')).toBeTruthy();
    expect(screen.queryByText('09:00')).toBeNull();
  });

  it('changing the time reschedules', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify({ enabled: true, time: '09:00' }));
    await mount();

    const chip = await screen.findByText('8pm');
    await act(async () => {
      fireEvent.press(chip);
    });

    await waitFor(() => {
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        '@juniper/reminders',
        expect.stringContaining('"time":"20:00"'),
      );
    });
  });

  it('explains the silence when reminders are on but the garden is empty', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify({ enabled: true, time: '09:00' }));
    await mount([]);
    await waitFor(() => expect(screen.getByText(/add a plant and the first nudge/)).toBeTruthy());
  });
});
