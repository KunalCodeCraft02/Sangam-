import Link from "next/link";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { Compass, MapPin, Calendar, Users, CheckCircle2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip, { MAX_TRIP_MEMBERS } from "@/models/Trip";
import JoinTripButton from "@/components/trip/JoinTripButton";
import { secondaryButtonClass } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function JoinTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);

  let trip = null;
  if (mongoose.isValidObjectId(tripId)) {
    await connectToDatabase();
    trip = await Trip.findById(tripId).populate("createdBy", "name").lean();
  }

  const callbackUrl = `/trip/join/${tripId}`;

  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-warm-gradient bg-noise px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-500 text-white shadow-soft">
            <Compass className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-forest-800">
            Sangam
          </span>
        </Link>

        <div className="rounded-2xl border border-sand-200 bg-white/90 p-8 shadow-card backdrop-blur-sm">
          {!trip ? (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-forest-900">
                Trip not found
              </h1>
              <p className="mt-2 text-sm text-forest-700/70">
                This invite link is invalid or the trip no longer exists.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block text-sm font-semibold text-terracotta-600 hover:text-terracotta-700"
              >
                Back to home
              </Link>
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-saffron-300/60 bg-sand-50 px-3 py-1 text-xs font-semibold tracking-wide text-terracotta-700">
                You&apos;re invited
              </span>
              <h1 className="text-balance mt-4 font-display text-2xl font-bold text-forest-900">
                {trip.name}
              </h1>
              {trip.createdBy && "name" in trip.createdBy && (
                <p className="mt-1 text-sm text-forest-700/70">
                  Hosted by {(trip.createdBy as { name: string }).name}
                </p>
              )}

              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-forest-800">
                  <MapPin className="h-4 w-4 text-terracotta-600" />
                  {trip.destination}
                </div>
                <div className="flex items-center gap-2 text-sm text-forest-800">
                  <Calendar className="h-4 w-4 text-terracotta-600" />
                  {dateFormatter.format(new Date(trip.startDate))} –{" "}
                  {dateFormatter.format(new Date(trip.endDate))}
                </div>
                <div className="flex items-center gap-2 text-sm text-forest-800">
                  <Users className="h-4 w-4 text-terracotta-600" />
                  {trip.memberIds.length}/{MAX_TRIP_MEMBERS} travelers
                </div>
              </div>

              <div className="mt-7">
                {!session?.user ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                      className="flex-1 rounded-full bg-saffron-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-soft transition hover:bg-saffron-600"
                    >
                      Register to join
                    </Link>
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                      className={secondaryButtonClass + " flex-1"}
                    >
                      Log in
                    </Link>
                  </div>
                ) : !session.user.onboardingComplete ? (
                  <Link
                    href={`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="block rounded-full bg-saffron-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-soft transition hover:bg-saffron-600"
                  >
                    Complete your dietary profile to join
                  </Link>
                ) : trip.memberIds.some((id) => id.toString() === session.user.id) ? (
                  <div className="flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    You&apos;re already in this trip.
                    <Link href="/dashboard" className="ml-auto font-semibold underline">
                      Dashboard
                    </Link>
                  </div>
                ) : trip.memberIds.length >= MAX_TRIP_MEMBERS ? (
                  <div className="rounded-xl bg-terracotta-100 px-4 py-3 text-sm text-terracotta-700">
                    This trip is full ({MAX_TRIP_MEMBERS} traveler max).
                  </div>
                ) : (
                  <JoinTripButton tripId={tripId} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
