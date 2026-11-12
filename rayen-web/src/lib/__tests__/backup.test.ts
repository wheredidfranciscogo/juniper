import { describe, expect, it } from 'vitest';

import type { Plant } from '../../data/types';
import { buildGardenFile, readGardenFile } from '../backup';

/**
 * The format string in a backup file is the one promise this app makes across a rename.
 *
 * On 2026-11-12 the app moved from juniper-navy.vercel.app to rayen-garden.vercel.app and
 * the storage identifiers went from "juniper" to "rayen" with it. That was only safe
 * because browser storage is per-origin, so the new origin was empty and gardens crossed
 * over in a backup file rather than being migrated in place. Every one of those files says
 * `juniper.garden`. If the reader ever stops accepting that string, the only copy of
 * somebody's garden stops opening — so this is the test that has to keep failing loudly.
 */

const plant: Plant = {
  id: 'p1',
  name: 'Fennel',
  species: 'Foeniculum vulgare',
  pressing: 'moss',
  icon: 'herb',
  waterEvery: 4,
  lastWateredISO: '2026-11-10T08:00:00.000Z',
  light: 'bright, indirect',
  addedISO: '2026-10-01T08:00:00.000Z',
  photos: [],
  journal: [],
};

const NOW = new Date('2026-11-12T18:00:00.000Z');

const input = { userName: 'June', plants: [plant], log: [] };

describe('garden backup files', () => {
  it('round-trips a file written by this version', async () => {
    const file = await buildGardenFile(input, NOW);
    expect(file.format).toBe('rayen.garden');

    const back = await readGardenFile(JSON.parse(JSON.stringify(file)), NOW);
    expect(back.profile.userName).toBe('June');
    expect(back.plants).toHaveLength(1);
    expect(back.plants[0]?.name).toBe('Fennel');
    expect(back.warnings).toEqual([]);
  });

  it('still opens a file written before the rename', async () => {
    const written = await buildGardenFile(input, NOW);
    const legacy = { ...JSON.parse(JSON.stringify(written)), format: 'juniper.garden' };

    const back = await readGardenFile(legacy, NOW);
    expect(back.plants[0]?.name).toBe('Fennel');
    expect(back.profile.userName).toBe('June');
  });

  it('refuses a file that is not a garden at all', async () => {
    const written = await buildGardenFile(input, NOW);
    const foreign = { ...JSON.parse(JSON.stringify(written)), format: 'something.else' };

    await expect(readGardenFile(foreign, NOW)).rejects.toThrow(/not a Rayen garden/);
    await expect(readGardenFile(null, NOW)).rejects.toThrow(/not a Rayen garden/);
  });
});
