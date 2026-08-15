import {
  hasPerenualKey,
  searchSpecies,
  sunlightToLight,
  wateringToDays,
} from '../perenual';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_PERENUAL_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.EXPO_PUBLIC_PERENUAL_KEY;
  else process.env.EXPO_PUBLIC_PERENUAL_KEY = ORIGINAL_KEY;
  jest.restoreAllMocks();
});

describe('hasPerenualKey', () => {
  it('reports true when the env var is set', () => {
    process.env.EXPO_PUBLIC_PERENUAL_KEY = 'k';
    expect(hasPerenualKey()).toBe(true);
  });
  it('reports false when missing or empty', () => {
    delete process.env.EXPO_PUBLIC_PERENUAL_KEY;
    expect(hasPerenualKey()).toBe(false);
    process.env.EXPO_PUBLIC_PERENUAL_KEY = '';
    expect(hasPerenualKey()).toBe(false);
  });
});

describe('searchSpecies', () => {
  it('returns [] without making a request when the key is missing', async () => {
    delete process.env.EXPO_PUBLIC_PERENUAL_KEY;
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(searchSpecies('monstera')).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns [] without making a request for blank queries', async () => {
    process.env.EXPO_PUBLIC_PERENUAL_KEY = 'k';
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(searchSpecies('   ')).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('parses the API response, flattening scientific_name arrays', async () => {
    process.env.EXPO_PUBLIC_PERENUAL_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 1,
              common_name: 'Swiss cheese plant',
              scientific_name: ['Monstera deliciosa'],
              watering: 'Average',
              sunlight: ['part_shade'],
            },
            {
              id: 2,
              common_name: null,
              scientific_name: 'Ficus lyrata',
              watering: null,
              sunlight: null,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const results = await searchSpecies('monstera');
    expect(results).toEqual([
      {
        id: 1,
        commonName: 'Swiss cheese plant',
        scientificName: 'Monstera deliciosa',
        watering: 'Average',
        sunlight: ['part_shade'],
      },
      {
        id: 2,
        commonName: '',
        scientificName: 'Ficus lyrata',
        watering: undefined,
        sunlight: undefined,
      },
    ]);
  });

  it('throws on a non-2xx response', async () => {
    process.env.EXPO_PUBLIC_PERENUAL_KEY = 'k';
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    await expect(searchSpecies('x')).rejects.toThrow('Perenual 429');
  });
});

describe('wateringToDays', () => {
  it('maps the documented buckets', () => {
    expect(wateringToDays('Frequent')).toBe(4);
    expect(wateringToDays('Average')).toBe(7);
    expect(wateringToDays('Minimum')).toBe(14);
    expect(wateringToDays('None')).toBe(30);
  });
  it('defaults to a weekly cadence for unknown or missing values', () => {
    expect(wateringToDays(undefined)).toBe(7);
    expect(wateringToDays('???')).toBe(7);
  });
});

describe('sunlightToLight', () => {
  it('maps tokens onto the UI labels', () => {
    expect(sunlightToLight(['full_sun'])).toBe('full sun');
    expect(sunlightToLight(['part_shade'])).toBe('dappled');
    expect(sunlightToLight(['filtered_shade'])).toBe('dappled');
    expect(sunlightToLight(['deep_shade'])).toBe('tolerates low');
    expect(sunlightToLight([])).toBe('bright indirect');
    expect(sunlightToLight(undefined)).toBe('bright indirect');
    expect(sunlightToLight(['something_else'])).toBe('bright indirect');
  });
});
