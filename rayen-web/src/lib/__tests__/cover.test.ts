import { coverPhotoUri } from '../cover';
import type { PlantPhoto } from '../../data/types';

const photos = (...list: PlantPhoto[]) => ({ photos: list });

describe('coverPhotoUri', () => {
  it('is undefined for a plant with no photographs', () => {
    expect(coverPhotoUri(photos())).toBeUndefined();
  });

  it('is undefined when the photos carry dates but no images', () => {
    // The seeded example has a history of dated entries with no files behind them; those
    // must keep showing the illustration rather than rendering a broken image.
    expect(coverPhotoUri(photos({ date: '2026-01-01' }, { date: '2025-06-01' }))).toBeUndefined();
  });

  it('takes the newest photograph, which is the first entry', () => {
    // Both the add-photo action and the edit form PREPEND, so "newest wins" needs no
    // separate "set as cover" step — taking a better photo simply replaces the old one.
    const uri = coverPhotoUri(
      photos(
        { date: '2026-08-30', uri: 'file:///documents/photos/new.jpg' },
        { date: '2026-01-01', uri: 'file:///documents/photos/old.jpg' },
      ),
    );
    expect(uri).toBe('file:///documents/photos/new.jpg');
  });

  it('skips dated entries with no image to find the first real one', () => {
    const uri = coverPhotoUri(
      photos({ date: '2026-08-30' }, { date: '2026-01-01', uri: 'file:///documents/photos/real.jpg' }),
    );
    expect(uri).toBe('file:///documents/photos/real.jpg');
  });

  it('ignores an empty uri string rather than rendering nothing', () => {
    expect(coverPhotoUri(photos({ date: '2026-08-30', uri: '' }))).toBeUndefined();
  });

  it('copes with photos being absent entirely', () => {
    expect(coverPhotoUri({ photos: undefined as unknown as PlantPhoto[] })).toBeUndefined();
  });
});
