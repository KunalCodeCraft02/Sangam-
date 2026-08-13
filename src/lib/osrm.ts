const OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/foot";
const REQUEST_TIMEOUT_MS = 15000;

export interface WalkingRoute {
  durationSeconds: number;
  distanceMeters: number;
  /** [lat, lng] pairs, ready for a Leaflet <Polyline positions={...} />. */
  routeGeoJson: [number, number][];
}

interface OsrmResponse {
  code: string;
  routes?: {
    duration: number;
    distance: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

/**
 * Best-effort walking route lookup. Returns null (never throws) so one
 * unreachable member doesn't block ETAs for the rest of the group.
 */
export async function getWalkingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<WalkingRoute | null> {
  try {
    const url = `${OSRM_BASE_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) return null;

    const data: OsrmResponse = await res.json();
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return null;

    return {
      durationSeconds: route.duration,
      distanceMeters: route.distance,
      routeGeoJson: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  } catch {
    return null;
  }
}
