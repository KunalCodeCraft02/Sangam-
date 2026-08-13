const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";
const REQUEST_TIMEOUT_MS = 8000;
const FETCH_LIMIT = 20;

export interface GeoapifyFeature {
  properties: {
    place_id: string;
    name?: string;
    categories?: string[];
    lat: number;
    lon: number;
    address_line2?: string;
    datasource?: { raw?: Record<string, string | number | boolean | undefined> };
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GeoapifyFeature[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY is not configured");
  }

  const url = new URL(GEOAPIFY_URL);
  url.searchParams.set("categories", "catering.restaurant,catering.cafe");
  url.searchParams.set("filter", `circle:${lng},${lat},${radiusMeters}`);
  url.searchParams.set("limit", String(FETCH_LIMIT));
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Geoapify API responded with ${res.status}`);
  }

  const data: GeoapifyResponse = await res.json();
  return data.features ?? [];
}

/** Pulls the underlying OSM tags Geoapify carries through on each place. */
export function rawTags(feature: GeoapifyFeature): Record<string, string | undefined> {
  const raw = feature.properties.datasource?.raw ?? {};
  const tags: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    tags[key] = value === undefined ? undefined : String(value);
  }
  return tags;
}
