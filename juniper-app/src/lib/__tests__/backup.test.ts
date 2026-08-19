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
  addedISO: '2025-09-17',
  photos: [],
  journal: [],
  ...over,
});

const state = (over: Partial<AppState> = {}): AppState => ({
  onboarded: true,
  userName: 'June',
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
    expect(b.profile).toEqual({ userName: 'June' });
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

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

import { parseBackup, pickBackup } from '../backup';
import * as DocumentPicker from 'expo-document-picker';

const mockPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>;

const validFile = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    app: 'juniper',
    format: 1,
    exportedAt: '2026-08-01T09:00:00.000Z',
    profile: { userName: 'June', archetype: 'forager' },
    plants: [plant()],
    log: [{ id: 'l1', plantId: 'marcel', kind: 'water', text: 'Watered Marcel.', when: '2026-08-01T09:00:00.000Z' }],
    ...over,
  });

describe('parseBackup — rejecting files that are not ours', () => {
  it('rejects text that is not JSON', () => {
    expect(parseBackup('not json {{{')).toEqual({ ok: false, reason: 'not-json' });
  });

  it('rejects JSON that is not a Juniper backup', () => {
    expect(parseBackup('{"app":"something-else"}')).toEqual({ ok: false, reason: 'not-juniper' });
    expect(parseBackup('[1,2,3]')).toEqual({ ok: false, reason: 'not-juniper' });
  });

  it('refuses a backup from a newer Juniper rather than dropping fields it added', () => {
    expect(parseBackup(validFile({ format: 99 }))).toEqual({ ok: false, reason: 'future-format' });
  });

  it('rejects a file with no readable plants', () => {
    expect(parseBackup(validFile({ plants: [] }))).toEqual({ ok: false, reason: 'no-plants' });
    expect(parseBackup(validFile({ plants: [{ nonsense: true }] }))).toEqual({
      ok: false,
      reason: 'no-plants',
    });
  });
});

describe('parseBackup — a good file', () => {
  it('round-trips what buildBackup wrote', () => {
    const exported = JSON.stringify(buildBackup(state(), now));
    const parsed = parseBackup(exported);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.plants).toHaveLength(1);
    expect(parsed.data.plants[0].lastWateredISO).toBe('2026-08-01T09:00:00.000Z');
    expect(parsed.data.profile).toEqual({ userName: 'June' });
    expect(parsed.data.skipped).toEqual({ plants: 0, log: 0 });
  });

  it('reports when the backup was taken', () => {
    const parsed = parseBackup(validFile());
    expect(parsed.ok && parsed.data.exportedAt).toBe('2026-08-01T09:00:00.000Z');
  });
});

describe('parseBackup — repairing damaged entries', () => {
  const parseOne = (p: Record<string, unknown>) => {
    const r = parseBackup(validFile({ plants: [p], log: [] }));
    if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
    return r.data;
  };

  it('drops a plant with no id or no name — it could not be shown or watered', () => {
    const r = parseBackup(validFile({ plants: [{ name: 'Nameless' }, { id: 'x' }, plant()] }));
    expect(r.ok && r.data.plants).toHaveLength(1);
    expect(r.ok && r.data.skipped.plants).toBe(2);
  });

  it('keeps a plant that is merely missing optional fields', () => {
    const { plants } = parseOne({ id: 'p', name: 'Pip' });
    expect(plants[0]).toMatchObject({ species: 'Unknown species', light: 'bright indirect', waterEvery: 7 });
  });

  it('treats an unparseable watering date as watered now, not 1970', () => {
    // Epoch would make the plant instantly and permanently thirsty, and fire a reminder
    // the moment the restore finished.
    const { plants } = parseOne({ id: 'p', name: 'Pip', lastWateredISO: 'whenever' });
    expect(Math.abs(Date.now() - Date.parse(plants[0].lastWateredISO))).toBeLessThan(5_000);
  });

  it('clamps an absurd watering cadence into something schedulable', () => {
    expect(parseOne({ id: 'a', name: 'A', waterEvery: 0 }).plants[0].waterEvery).toBe(1);
    expect(parseOne({ id: 'b', name: 'B', waterEvery: -5 }).plants[0].waterEvery).toBe(1);
    expect(parseOne({ id: 'c', name: 'C', waterEvery: 99999 }).plants[0].waterEvery).toBe(365);
    expect(parseOne({ id: 'd', name: 'D', waterEvery: 'soon' }).plants[0].waterEvery).toBe(7);
  });

  it('keeps only the first of two plants sharing an id', () => {
    // Duplicates would collide as React keys and make watering ambiguous.
    const r = parseBackup(
      validFile({ plants: [{ id: 'dup', name: 'First' }, { id: 'dup', name: 'Second' }], log: [] }),
    );
    expect(r.ok && r.data.plants).toHaveLength(1);
    expect(r.ok && r.data.plants[0].name).toBe('First');
    expect(r.ok && r.data.skipped.plants).toBe(1);
  });

  it('discards a photo uri from another device', () => {
    // The file it points at does not exist here; the timeline falls back to a pressing.
    const { plants } = parseOne({
      id: 'p',
      name: 'Pip',
      photos: [
        { date: '2026-01-01', uri: 'file:///elsewhere/DCIM/img.jpg' },
        { date: '2026-01-02', uri: 'file:///documents/photos/p_ours.jpg' },
      ],
    });
    expect(plants[0].photos[0].uri).toBeUndefined();
    expect(plants[0].photos[1].uri).toBe('file:///documents/photos/p_ours.jpg');
  });

  it('survives fields that are the wrong type entirely', () => {
    const { plants } = parseOne({ id: 'p', name: 'Pip', photos: 'lots', journal: 42, nickname: 7 });
    expect(plants[0].photos).toEqual([]);
    expect(plants[0].journal).toEqual([]);
    expect(plants[0].nickname).toBeUndefined();
  });
});

describe('parseBackup — the log', () => {
  it('drops entries pointing at plants the file does not contain', () => {
    // An orphan entry renders as a row about a plant that does not exist.
    const r = parseBackup(
      validFile({
        log: [
          { id: 'a', plantId: 'marcel', kind: 'water', text: 'ok', when: '2026-08-01T09:00:00.000Z' },
          { id: 'b', plantId: 'ghost', kind: 'water', text: 'orphan', when: '2026-08-01T09:00:00.000Z' },
        ],
      }),
    );
    expect(r.ok && r.data.log).toHaveLength(1);
    expect(r.ok && r.data.skipped.log).toBe(1);
  });

  it('drops entries with an unknown kind or an unparseable timestamp', () => {
    const r = parseBackup(
      validFile({
        log: [
          { id: 'a', plantId: 'marcel', kind: 'sacrificed', text: '', when: '2026-08-01T09:00:00.000Z' },
          { id: 'b', plantId: 'marcel', kind: 'water', text: '', when: 'sometime' },
        ],
      }),
    );
    expect(r.ok && r.data.log).toHaveLength(0);
    expect(r.ok && r.data.skipped.log).toBe(2);
  });

  it('returns the log newest first, as the store holds it', () => {
    const r = parseBackup(
      validFile({
        log: [
          { id: 'old', plantId: 'marcel', kind: 'water', text: '', when: '2026-01-01T00:00:00.000Z' },
          { id: 'new', plantId: 'marcel', kind: 'water', text: '', when: '2026-08-01T00:00:00.000Z' },
        ],
      }),
    );
    expect(r.ok && r.data.log.map((e) => e.id)).toEqual(['new', 'old']);
  });
});

describe('parseBackup — the profile', () => {
  it('ignores an archetype from an older backup rather than rejecting the file', () => {
    // The archetype was removed from the product; a backup taken before that still
    // carries one and must still restore cleanly.
    const r = parseBackup(validFile({ profile: { userName: 'X', archetype: 'wizard' } }));
    expect(r.ok && r.data.profile).toEqual({ userName: 'X' });
  });

  it('copes with no profile at all', () => {
    const r = parseBackup(validFile({ profile: undefined }));
    expect(r.ok && r.data.profile).toEqual({ userName: '' });
  });
});

describe('pickBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports cancellation distinctly, so the UI can stay silent', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    await expect(pickBackup()).resolves.toEqual({ ok: false, reason: 'cancelled' });
  });

  it('reports an unreadable file rather than throwing into the UI', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/x.json' }],
    } as never);
    MockFile.mockImplementationOnce(() => ({
      text: jest.fn(() => Promise.reject(new Error('gone'))),
    }));
    await expect(pickBackup()).resolves.toEqual({ ok: false, reason: 'unreadable' });
  });

  it('parses a picked file', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/x.json' }],
    } as never);
    MockFile.mockImplementationOnce(() => ({ text: jest.fn(() => Promise.resolve(validFile())) }));

    const result = await pickBackup();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.plants[0].name).toBe('Marcel');
  });
});
