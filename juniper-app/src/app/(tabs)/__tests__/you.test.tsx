/**
 * The You screen is the only surface that can switch reminders on, so these tests
 * cover the states where getting it wrong is worst: claiming reminders are on when
 * the OS will never deliver one, and losing the permission-denied signal.
 */

import * as React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
const mockSharing = Sharing as jest.Mocked<typeof Sharing>;
const mockPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>;

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'marcel',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  light: 'bright indirect',
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
    completeOnboarding({ userName: 'June', seed: false });
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
  await waitFor(() => expect(screen.getByText('YOUR GARDEN')).toBeTruthy());
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
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockSharing.shareAsync.mockResolvedValue(undefined as never);
});

describe('You — identity and stats', () => {
  it('greets by name and shows the garden stats', async () => {
    await mount([plant()]);
    // Seed sets the name in an effect, so the greeting arrives a tick after mount.
    await waitFor(() => expect(screen.getByText('Hello, June.')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('1 plant')).toBeTruthy());
    expect(screen.getByText('IN YOUR CARE')).toBeTruthy();
    expect(screen.getByText('LONGEST TENDED')).toBeTruthy();
  });

  it('shows no archetype and no plant-days', async () => {
    // Both were decoration: the archetype christened you "The Plant Whisperer", and
    // plant-days was a number nobody could interpret.
    await mount([plant()]);
    expect(screen.queryByText(/Whisperer|Collector|Forager|Steady Hand/)).toBeNull();
    expect(screen.queryByText('PLANT-DAYS')).toBeNull();
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
    // Seed adds the plant in an effect, and mount() only waits on 'YOUR GARDEN', which
    // renders either way. syncReminders returns early on an empty garden, so flipping
    // the toggle before the plant lands schedules NOTHING and the test fails claiming
    // the queue was never built. Wait for the plant, exactly as the backup tests do.
    await waitFor(() => expect(screen.getByText('1 plant')).toBeTruthy());

    const toggle = await screen.findByRole('switch');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    // Both assertions sit inside the waitFor: setReminder writes the preference and only
    // THEN calls syncReminders, so the write lands several awaits before the first
    // scheduleNotificationAsync.
    await waitFor(() => {
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        '@juniper/reminders',
        expect.stringContaining('"enabled":true'),
      );
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
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

describe('You — backup', () => {
  it('exports the garden to the share sheet', async () => {
    await mount([plant()]);
    // Seed adds the plant in an effect; pressing before it lands would exercise the
    // empty-garden path instead of the one under test.
    await waitFor(() => expect(screen.getByText('1 plant')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Export your data'));
    });

    await waitFor(() => expect(mockSharing.shareAsync).toHaveBeenCalled());
    const [, options] = mockSharing.shareAsync.mock.calls[0];
    expect(options).toEqual(expect.objectContaining({ mimeType: 'application/json' }));
  });

  it('says so plainly rather than sharing an empty file', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await mount([]);

    await act(async () => {
      fireEvent.press(screen.getByText('Export your data'));
    });

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Nothing to back up yet', expect.any(String)));
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('makes clear that Juniper is not the one uploading it', async () => {
    await mount();
    expect(screen.getByText(/you choose where it goes/)).toBeTruthy();
  });
});


describe('You — restore', () => {
  const backupFile = JSON.stringify({
    app: 'juniper',
    format: 1,
    exportedAt: '2026-08-01T09:00:00.000Z',
    profile: { userName: 'June', archetype: 'forager' },
    plants: [
      { id: 'a', name: 'Alpha', species: 'Aloe vera', waterEvery: 7, lastWateredISO: '2026-08-01T09:00:00.000Z', addedISO: '2025-01-01' },
      { id: 'b', name: 'Beta', species: 'Ficus lyrata', waterEvery: 10, lastWateredISO: '2026-08-01T09:00:00.000Z', addedISO: '2025-01-01' },
    ],
    log: [],
  });

  const pickReturns = (text: string) => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/backup.json' }],
    } as never);
    const { File } = jest.requireMock('expo-file-system');
    (File as jest.Mock).mockImplementationOnce(() => ({ text: jest.fn(() => Promise.resolve(text)) }));
  };

  it('offers restore, and is explicit that it replaces rather than merges', async () => {
    await mount();
    expect(screen.getByText('Import a previous export')).toBeTruthy();
    expect(screen.getByText(/replaces what's here rather than merging/)).toBeTruthy();
  });

  it('confirms before replacing, naming what is in the file and what is lost', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await mount([plant()]);
    await waitFor(() => expect(screen.getByText('1 plant')).toBeTruthy());
    pickReturns(backupFile);

    await act(async () => {
      fireEvent.press(screen.getByText('Import a previous export'));
    });

    await waitFor(() => expect(alert).toHaveBeenCalled());
    const [title, body] = alert.mock.calls[0];
    expect(title).toBe('Replace your garden?');
    // Real numbers on both sides — "Are you sure?" is not enough for an act with no undo.
    expect(body).toContain('2 plants');
    expect(body).toContain('Your current 1 plant will be replaced');
    expect(body).toContain("can't be undone");
    alert.mockRestore();
  });

  it('does not call it a replacement when the garden is empty', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await mount([]);
    pickReturns(backupFile);

    await act(async () => {
      fireEvent.press(screen.getByText('Import a previous export'));
    });

    await waitFor(() => expect(alert).toHaveBeenCalled());
    const [title, body] = alert.mock.calls[0];
    expect(title).toBe('Restore your garden?');
    expect(body).not.toContain('will be replaced');
    alert.mockRestore();
  });

  it('only replaces once the confirm button is pressed', async () => {
    let confirm: (() => void) | undefined;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _b, buttons) => {
      confirm = (buttons as { text: string; onPress?: () => void }[])?.find(
        (b) => b.text === 'Replace' || b.text === 'Restore',
      )?.onPress;
    });

    await mount([plant()]);
    await waitFor(() => expect(screen.getByText('1 plant')).toBeTruthy());
    pickReturns(backupFile);

    await act(async () => {
      fireEvent.press(screen.getByText('Import a previous export'));
    });
    await waitFor(() => expect(confirm).toBeDefined());

    // Nothing has changed yet — the dialog is the gate.
    expect(screen.getByText('1 plant')).toBeTruthy();

    await act(async () => {
      confirm?.();
    });
    await waitFor(() => expect(screen.getByText('2 plants')).toBeTruthy());
    alert.mockRestore();
  });

  it('explains a file it cannot read instead of failing silently', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await mount();
    pickReturns('{"app":"something-else"}');

    await act(async () => {
      fireEvent.press(screen.getByText('Import a previous export'));
    });

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not restore', expect.stringContaining('Juniper backup')));
    alert.mockRestore();
  });

  it('says nothing at all when the picker is cancelled', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await mount();
    mockPicker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null } as never);

    await act(async () => {
      fireEvent.press(screen.getByText('Import a previous export'));
    });

    await waitFor(() => expect(mockPicker.getDocumentAsync).toHaveBeenCalled());
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
