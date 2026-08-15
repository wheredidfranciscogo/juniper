import { Directory, File } from 'expo-file-system';

import { deletePhoto, extensionFor, photoFilename, savePhoto } from '../photos';

const MockFile = File as unknown as jest.Mock;
const MockDirectory = Directory as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extensionFor', () => {
  it('reads the extension off the path', () => {
    expect(extensionFor('file:///x/photo.png')).toBe('.png');
    expect(extensionFor('file:///x/photo.JPEG')).toBe('.jpeg');
  });

  it('ignores query strings and fragments', () => {
    expect(extensionFor('file:///x/photo.heic?width=200')).toBe('.heic');
    expect(extensionFor('file:///x/photo.webp#top')).toBe('.webp');
  });

  it('falls back to .jpg for the picker paths that carry no useful extension', () => {
    expect(extensionFor('file:///x/ImagePicker/abc123')).toBe('.jpg');
    expect(extensionFor('file:///x/abc.tmp')).toBe('.jpg');
  });
});

describe('photoFilename', () => {
  it('keeps the extension and prefixes the name', () => {
    expect(photoFilename('file:///x/a.png', 'seed1')).toBe('p_seed1.png');
  });

  it('strips characters that have no business in a filename', () => {
    expect(photoFilename('file:///x/a.jpg', '2026-08-15T10:00:00.000Z')).toBe(
      'p_20260815T100000000.jpg',
    );
  });

  it('produces different names for the same source on repeat picks', () => {
    // The picker reuses filenames across sessions, so a stable name would silently
    // overwrite an earlier photo.
    expect(photoFilename('file:///x/image.jpg')).not.toBe(photoFilename('file:///x/image.jpg'));
  });
});

describe('savePhoto', () => {
  it('copies the picked file into the photo directory and returns the durable uri', async () => {
    MockFile.mockImplementationOnce(() => ({ exists: true, copy: jest.fn(), uri: 'file:///cache/pick.jpg' }));
    MockFile.mockImplementationOnce(() => ({ exists: false, copy: jest.fn(), uri: 'file:///documents/photos/p_x.jpg' }));

    const uri = await savePhoto('file:///cache/pick.jpg');

    expect(uri).toBe('file:///documents/photos/p_x.jpg');
    const source = MockFile.mock.results[0].value;
    expect(source.copy).toHaveBeenCalled();
  });

  it('creates the photo directory the first time', async () => {
    MockDirectory.mockImplementationOnce(() => ({
      exists: false,
      create: jest.fn(),
      uri: 'file:///documents/photos/',
    }));
    MockFile.mockImplementationOnce(() => ({ exists: true, copy: jest.fn(), uri: 'x' }));
    MockFile.mockImplementationOnce(() => ({ exists: false, copy: jest.fn(), uri: 'y' }));

    await savePhoto('file:///cache/pick.jpg');
    expect(MockDirectory.mock.results[0].value.create).toHaveBeenCalled();
  });

  it('returns null when the source is gone, so no broken uri is stored', async () => {
    // The picker's cache can be cleared between picking and saving. Storing the uri
    // anyway would put a permanently broken image on the plant's timeline.
    MockFile.mockImplementationOnce(() => ({ exists: false }));
    await expect(savePhoto('file:///cache/gone.jpg')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the copy fails', async () => {
    MockFile.mockImplementationOnce(() => ({
      exists: true,
      copy: jest.fn(() => {
        throw new Error('no space');
      }),
    }));
    MockFile.mockImplementationOnce(() => ({ exists: false, uri: 'y' }));
    await expect(savePhoto('file:///cache/pick.jpg')).resolves.toBeNull();
  });
});

describe('deletePhoto', () => {
  it('deletes a file inside our own photo directory', async () => {
    MockFile.mockImplementationOnce(() => ({ exists: true, delete: jest.fn() }));
    await deletePhoto('file:///documents/photos/p_abc.jpg');
    expect(MockFile.mock.results[0].value.delete).toHaveBeenCalled();
  });

  it('refuses to touch anything outside the photo directory', async () => {
    // A malformed or foreign uri must never become a delete primitive pointed at
    // arbitrary storage.
    await deletePhoto('file:///documents/important.db');
    expect(MockFile).not.toHaveBeenCalled();
  });

  it('is a no-op when the file is already gone', async () => {
    MockFile.mockImplementationOnce(() => ({ exists: false, delete: jest.fn() }));
    await deletePhoto('file:///documents/photos/p_missing.jpg');
    expect(MockFile.mock.results[0].value.delete).not.toHaveBeenCalled();
  });
});
