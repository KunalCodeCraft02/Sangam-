import Link from "next/link";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Trophy, Tag, Wallet, Compass } from "lucide-react";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip from "@/models/Trip";
import "@/models/User";
import { loadTripDigest } from "@/lib/digest";
import DigestHeatMap from "@/components/trip/digest/DigestHeatMap";

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function TripDigestPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${tripId}/digest`)}`);
  }
  if (!mongoose.isValidObjectId(tripId)) {
    redirect("/dashboard");
  }

  await connectToDatabase();
  const trip = await Trip.findById(tripId).populate("memberIds", "name").lean();
  if (!trip) {
    redirect("/dashboard");
  }

  const members = trip.memberIds as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
  }>;
  const isMember = members.some((m) => m._id.toString() === session.user.id);
  if (!isMember) {
    redirect(`/trip/join/${tripId}`);
  }

  const digest = await loadTripDigest(tripId);

  return (
    <div className="min-h-[calc(100vh-1px)] bg-warm-gradient bg-noise">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Link
          href={`/trip/${tripId}`}
          className="text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
        >
          &larr; Back to trip
        </Link>

        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron-300/60 bg-sand-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-terracotta-700">
            <Compass className="h-3.5 w-3.5" />
            Trip memories
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold text-forest-900">{trip.name}</h1>
          <p className="mt-2 text-forest-700/70">
            {trip.destination} · {members.length} traveler{members.length === 1 ? "" : "s"}
          </p>
          {trip.status !== "completed" && (
            <p className="mt-2 text-xs font-semibold text-saffron-700">
              This trip is still active — here&apos;s the story so far.
            </p>
          )}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-sand-200 bg-white p-6 text-center shadow-card">
            <Trophy className="mx-auto h-6 w-6 text-saffron-600" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-forest-500">
              Top-Voted Restaurant
            </p>
            {digest.topRestaurant ? (
              <>
                <p className="mt-1 text-balance font-display text-xl font-bold text-forest-900">
                  {digest.topRestaurant.name}
                </p>
                <p className="text-xs text-forest-700/60">
                  {digest.topRestaurant.votes} vote{digest.topRestaurant.votes === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-forest-700/60">No polls were held</p>
            )}
          </div>

          <div className="rounded-2xl border border-sand-200 bg-white p-6 text-center shadow-card">
            <Tag className="mx-auto h-6 w-6 text-forest-600" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-forest-500">
              Best Deal Found
            </p>
            {digest.bestDeal ? (
              <>
                <p className="mt-1 text-balance font-display text-xl font-bold text-forest-900">
                  {digest.bestDeal.itemName}
                </p>
                <p className="text-xs text-forest-700/60">
                  {rupeeFormatter.format(digest.bestDeal.priceInr)} · {digest.bestDeal.loggedBy}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-forest-700/60">No prices logged</p>
            )}
          </div>

          <div className="rounded-2xl border border-sand-200 bg-white p-6 text-center shadow-card">
            <Wallet className="mx-auto h-6 w-6 text-terracotta-600" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-forest-500">
              Total Group Spend
            </p>
            <p className="mt-1 font-display text-xl font-bold text-forest-900">
              {rupeeFormatter.format(digest.totalSpend)}
            </p>
            <p className="text-xs text-forest-700/60">
              across {digest.spendByMember.length} traveler{digest.spendByMember.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {digest.spendByMember.length > 0 && (
          <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-forest-900">Spend breakdown</h2>
            <ul className="mt-4 space-y-2">
              {digest.spendByMember.map((m) => (
                <li key={m.userName} className="flex items-center justify-between text-sm">
                  <span className="text-forest-800">{m.userName}</span>
                  <span className="font-semibold text-forest-900">{rupeeFormatter.format(m.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-sand-200 shadow-card">
          <div className="border-b border-sand-200 bg-white px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-forest-900">Where you went</h2>
            <p className="text-xs text-forest-700/60">
              Heat map of every price log and confirmed meeting point from the trip
            </p>
          </div>
          <div className="h-[420px]">
            <DigestHeatMap points={digest.heatPoints} />
          </div>
        </div>
      </div>
    </div>
  );
}
