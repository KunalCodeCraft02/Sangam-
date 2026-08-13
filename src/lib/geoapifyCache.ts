import GeoapifyCache from "@/models/GeoapifyCache";
import type { GeoapifyFeature } from "@/lib/geoapify";

// ~1.1km grid cells — coarse enough that nearby searches (e.g. repeated
// "Search again" clicks, or the group center shifting slightly as members
// move) share a cache entry, without drifting into a genuinely different
// neighborhood.
function roundCoord(value: number) {
  return Math.round(value * 100) / 100;
}

export function geoapifyCacheKey(lat: number, lng: number, radiusMeters: number) {
  return `${roundCoord(lat)}:${roundCoord(lng)}:${radiusMeters}`;
}

export async function getCachedPlaces(cacheKey: string): Promise<GeoapifyFeature[] | null> {
  const hit = await GeoapifyCache.findOne({ cacheKey }).lean();
  return hit?.features ?? null;
}

export async function setCachedPlaces(cacheKey: string, features: GeoapifyFeature[]) {
  await GeoapifyCache.updateOne(
    { cacheKey },
    { $set: { features, createdAt: new Date() } },
    { upsert: true }
  );
}
