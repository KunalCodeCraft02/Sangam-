import Link from "next/link";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MapPin, Calendar, Users, BookOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip, { MAX_TRIP_MEMBERS } from "@/models/Trip";
import "@/models/User";
import TripDashboardClient from "@/components/trip/TripDashboardClient";
import EndTripButton from "@/components/trip/EndTripButton";
import type { TripMember } from "@/components/trip/TripMap";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${tripId}`)}`);
  }
  if (!session.user.onboardingComplete) {
    redirect(`/onboarding?callbackUrl=${encodeURIComponent(`/trip/${tripId}`)}`);
  }

  if (!mongoose.isValidObjectId(tripId)) {
    redirect("/dashboard");
  }

  await connectToDatabase();
  const trip = await Trip.findById(tripId)
    .populate("memberIds", "name location")
    .lean();

  if (!trip) {
    redirect("/dashboard");
  }

  const members = trip.memberIds as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    location?: { lat: number; lng: number; mode: "real" | "simulated"; updatedAt: Date };
  }>;

  const isMember = members.some((member) => member._id.toString() === session.user.id);
  if (!isMember) {
    redirect(`/trip/join/${tripId}`);
  }

  const self = members.find((member) => member._id.toString() === session.user.id);

  const tripMembers: TripMember[] = members.map((member) => ({
    id: member._id.toString(),
    name: member.name,
    location: member.location
      ? {
          lat: member.location.lat,
          lng: member.location.lng,
          mode: member.location.mode,
          updatedAt: member.location.updatedAt.toISOString(),
        }
      : null,
  }));

  return (
    <div className="min-h-[calc(100vh-1px)] bg-sand-100">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
            >
              &larr; Back to trips
            </Link>
            <h1 className="mt-1 font-display text-3xl font-bold text-forest-900">{trip.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-forest-700/70">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-terracotta-600" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-terracotta-600" />
                {dateFormatter.format(new Date(trip.startDate))} –{" "}
                {dateFormatter.format(new Date(trip.endDate))}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-terracotta-600" />
                {trip.memberIds.length}/{MAX_TRIP_MEMBERS} travelers
              </span>
              {trip.status === "completed" && (
                <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-700">
                  Trip ended
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/trip/${tripId}/digest`}
              className="inline-flex items-center gap-2 rounded-full border border-forest-300 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-sand-50"
            >
              <BookOpen className="h-4 w-4" />
              Trip Digest
            </Link>
            {trip.status !== "completed" && trip.createdBy.toString() === session.user.id && (
              <EndTripButton tripId={tripId} />
            )}
          </div>
        </div>

        <div className="mt-8">
          <TripDashboardClient
            tripId={tripId}
            selfId={session.user.id}
            selfName={self?.name ?? session.user.name ?? "You"}
            initialMembers={tripMembers}
          />
        </div>
      </div>
    </div>
  );
}
