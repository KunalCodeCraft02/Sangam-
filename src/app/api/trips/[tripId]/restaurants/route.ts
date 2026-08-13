import { NextResponse } from "next/server";
import User from "@/models/User";
import { requireTripMember } from "@/lib/tripAuth";
import { fetchNearbyPlaces, rawTags } from "@/lib/geoapify";
import { geoapifyCacheKey, getCachedPlaces, setCachedPlaces } from "@/lib/geoapifyCache";
import { haversineDistanceMeters, centerPoint } from "@/lib/geo";
import { scoreRestaurant } from "@/lib/foodScoring";

const SEARCH_RADIUS_METERS = 2000;
const TOP_RESULTS = 10;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "Valid lat and lng query params are required" }, { status: 400 });
  }

  const members = await User.find({ _id: { $in: auth.trip.memberIds } })
    .select("name dietType allergies spiceTolerance location")
    .lean();

  // Prefer the group's actual active/simulated positions over the requester's
  // own coordinates, so the search center reflects where everyone is, not
  // just whoever hit "Search".
  const memberPositions = members
    .filter((m) => m.location)
    .map((m) => ({ lat: m.location!.lat, lng: m.location!.lng }));
  const center = memberPositions.length > 0 ? centerPoint(memberPositions) : { lat, lng };

  const cacheKey = geoapifyCacheKey(center.lat, center.lng, SEARCH_RADIUS_METERS);

  let features = await getCachedPlaces(cacheKey);
  if (!features) {
    try {
      features = await fetchNearbyPlaces(center.lat, center.lng, SEARCH_RADIUS_METERS);
    } catch (err) {
      console.error("Geoapify fetch failed:", err);
      return NextResponse.json(
        { error: "Couldn't reach the Geoapify API right now. Please try again in a moment." },
        { status: 502 }
      );
    }
    await setCachedPlaces(cacheKey, features);
  }

  const memberProfiles = members.map((m) => ({
    name: m.name,
    dietType: m.dietType,
    allergies: m.allergies,
    spiceTolerance: m.spiceTolerance,
  }));

  const restaurants = features
    .filter((f) => f.properties.name)
    .map((f) => {
      const { lat: fLat, lon: fLng, place_id, name, categories } = f.properties;
      const tags = rawTags(f);
      const distanceMeters = Math.round(haversineDistanceMeters(center.lat, center.lng, fLat, fLng));
      const { score, light, reasons, notes, affectedMembers, impactSummary } = scoreRestaurant(
        tags,
        memberProfiles,
        categories ?? []
      );

      return {
        osmId: place_id,
        name: name!,
        amenity: tags.amenity,
        cuisine: tags.cuisine,
        lat: fLat,
        lng: fLng,
        distanceMeters,
        score,
        light,
        reasons,
        notes,
        affectedMembers,
        impactSummary,
      };
    })
    .sort((a, b) => b.score - a.score || a.distanceMeters - b.distanceMeters)
    .slice(0, TOP_RESULTS);

  return NextResponse.json({ restaurants, memberCount: members.length, center });
}
