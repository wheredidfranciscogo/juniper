/**
 * Perenual species-list client — backs the Search path on Add Plant.
 * Requires EXPO_PUBLIC_PERENUAL_KEY. Returns [] when the key is missing so the
 * UI can render a "key not set" hint instead of throwing.
 */

const ENDPOINT = 'https://perenual.com/api/species-list';

export interface SpeciesResult {
  id: number;
  commonName: string;
  scientificName: string;
  watering?: string;
  sunlight?: string[];
}

interface PerenualSpecies {
  id: number;
  common_name?: string | null;
  scientific_name?: string | string[] | null;
  watering?: string | null;
  sunlight?: string[] | null;
}

interface PerenualResponse {
  data?: PerenualSpecies[];
}

export function hasPerenualKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_PERENUAL_KEY);
}

export async function searchSpecies(
  query: string,
  signal?: AbortSignal,
): Promise<SpeciesResult[]> {
  const key = process.env.EXPO_PUBLIC_PERENUAL_KEY;
  if (!key) return [];
  const q = query.trim();
  if (!q) return [];

  const url = `${ENDPOINT}?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Perenual ${res.status}`);
  const json = (await res.json()) as PerenualResponse;

  return (json.data ?? []).map((d) => ({
    id: d.id,
    commonName: d.common_name ?? '',
    scientificName: Array.isArray(d.scientific_name)
      ? d.scientific_name[0] ?? ''
      : d.scientific_name ?? '',
    watering: d.watering ?? undefined,
    sunlight: d.sunlight ?? undefined,
  }));
}

/** Coarse mapping of Perenual's watering enum onto days-between-watering. */
export function wateringToDays(watering?: string): number {
  switch ((watering ?? '').toLowerCase()) {
    case 'frequent':
      return 4;
    case 'average':
      return 7;
    case 'minimum':
      return 14;
    case 'none':
      return 30;
    default:
      return 7;
  }
}

/** Coarse mapping of Perenual sunlight tokens onto the UI's free-text light label. */
export function sunlightToLight(sunlight?: string[]): string {
  if (!sunlight || sunlight.length === 0) return 'bright indirect';
  const first = sunlight[0].toLowerCase().replace(/_/g, ' ');
  if (first.includes('full sun')) return 'full sun';
  if (first.includes('part shade') || first.includes('part sun') || first.includes('filtered')) {
    return 'dappled';
  }
  if (first.includes('full shade') || first.includes('deep shade')) return 'tolerates low';
  return 'bright indirect';
}
