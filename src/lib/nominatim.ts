const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim's usage policy requires a descriptive User-Agent and caps usage at
// roughly 1 request/second: https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = "Sangam-TripPlanner/1.0 (contact: kunalbodkhe080@gmail.com)";
const MIN_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 8000;

interface NominatimAddress {
  shop?: string;
  amenity?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  [key: string]: string | undefined;
}

interface NominatimResponse {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function runThrottled<T>(fn: () => Promise<T>): Promise<T> {
  const scheduled = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  queue = scheduled.catch(() => {});
  return scheduled.then(fn);
}

/**
 * Best-effort reverse geocode. Returns null (never throws) so a Nominatim
 * outage doesn't block the price log itself — the caller can save the log
 * without a location name.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  return runThrottled(async () => {
    try {
      const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) return null;

      const data: NominatimResponse = await res.json();
      const address = data.address ?? {};

      return (
        data.name ||
        address.shop ||
        address.amenity ||
        address.road ||
        address.neighbourhood ||
        address.suburb ||
        data.display_name?.split(",")[0] ||
        null
      );
    } catch {
      return null;
    }
  });
}

export interface PlaceResult {
  placeId: number;
  name: string;
  lat: number;
  lng: number;
}

interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Forward-geocode a free-text query into place matches. Returns an empty
 * array (never throws) so a Nominatim outage just yields no suggestions.
 */
export async function searchPlaces(query: string, limit = 5): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return runThrottled(async () => {
    try {
      const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&q=${encodeURIComponent(trimmed)}&limit=${limit}&addressdetails=0`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) return [];

      const data: NominatimSearchResult[] = await res.json();
      return data.map((r) => ({
        placeId: r.place_id,
        name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
    } catch {
      return [];
    }
  });
}
