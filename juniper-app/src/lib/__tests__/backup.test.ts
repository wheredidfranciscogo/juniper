import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { BACKUP_FORMAT, backupFilename, buildBackup, exportBackup } from '../backup';
import type { AppState } from '../store';
import type { Plant } from '../../data/types';

const mockSharing = Sharing as jest.Mocked<typeof Sharing>;
const MockFile = File as unknown as jest.Mock;

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'marcel',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 7,
  lastWateredISO: '2026-08-01T09:00:00.000Z',
  light: 'bright indirect',
  temp: 'warm',
  addedISO: '2025-09-17',
  photos: [],
  journal: [],
  ...over,
});

const state = (over: Partial<AppState> = {}): AppState => ({
  onboarded: true,
  userName: 'June',
  archetype: 'whisperer',
  plants: [plant()],
  log: [{ id: 'l1', plantId: 'marcel', kind: 'water', text: 'Watered Marcel.', when: '2026-08-01T09:00:00.000Z' }],
  ...over,
});

const now = new Date(2026, 7, 15, 10, 0, 0);

describe('buildBackup', () => {
  it('captures the whole garden, tagged and dated', () => {
    const b = buildBackup(state(), now);
    expect(b.app).toBe('juniper');
    expect(b.format).toBe(BACKUP_FORMAT);
    expect(b.exportedAt).toBe(now.toISOString());
    expect(b.profile).toEqual({ userName: 'June', archetype: 'whisperer' });
    expect(b.plants).toHaveLength(1);
    expect(b.log).toHaveLength(1);
  });

  it('round-trips through JSON without loss', () => {
    const b = buildBackup(state(), now);
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });

  it('keeps the watering timestamps, which are the part that matters', () => {
    const b = buildBackup(state(), now);
    expect(b.plants[0].lastWateredISO).toBe('2026-08-01T09:00:00.000Z');
  });
});

describe('backupFilename', () => {
  it('is dated and sortable', () => {
    expect(backupFilename(new Date(2026, 7, 15))).toBe('juniper-garden-2026-08-15.json');
  });

  it('zero-pads single-digit months and days', () => {
    expect(backupFilename(new Date(2026, 0, 5))).toBe('juniper-garden-2026-01-05.json');
  });
});

describe('exportBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharing.isAvailableAsync.mockResolvedValue(true);
    mockSharing.shareAsync.mockResolvedValue(undefined as never);
  });

  it('refuses to export an empty garden rather than sharing an empty file', async () => {
    await expect(exportBackup(state({ plants: [] }), now)).resolves.toEqual({
      ok: false,
      reason: 'empty',
    });
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });

  it('reports unavailability instead of failing silently', async () => {
    mockSharing.isAvailableAsync.mockResolvedValue(false);
    await expect(exportBackup(state(), now)).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('writes the file and hands it to the share sheet', async () => {
    const result = await exportBackup(state(), now);

    expect(result).toEqual({ ok: true, filename: 'juniper-garden-2026-08-15.json' });

    const instance = MockFile.mock.results[0].value;
    expect(instance.create).toHaveBeenCalled();
    const written = instance.write.mock.calls[0][0];
    expect(JSON.parse(written).app).toBe('juniper');
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(
      instance.uri,
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  it('overwrites a same-day export rather than failing on the second tap', async () => {
    MockFile.mockImplementationOnce(() => ({
      exists: true,
      uri: 'file:///cache/juniper-garden-2026-08-15.json',
      create: jest.fn(),
      write: jest.fn(),
      delete: jest.fn(),
    }));

    await exportBackup(state(), now);
    const instance = MockFile.mock.results[0].value;
    expect(instance.delete).toHaveBeenCalled();
    expect(instance.create).toHaveBeenCalled();
  });

  it('reports a failure rather than throwing into the UI', async () => {
    MockFile.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    await expect(exportBackup(state(), now)).resolves.toEqual({ ok: false, reason: 'failed' });
  });
});
