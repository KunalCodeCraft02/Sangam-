import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip from "@/models/Trip";
import CreateTripModal from "@/components/dashboard/CreateTripModal";
import TripCard from "@/components/dashboard/TripCard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (!session.user.onboardingComplete) {
    redirect("/onboarding?callbackUrl=/dashboard");
  }

  await connectToDatabase();
  const trips = await Trip.find({ memberIds: session.user.id })
    .sort({ startDate: 1 })
    .lean();

  return (
    <div className="min-h-[calc(100vh-1px)] bg-sand-100">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-terracotta-600">
              Welcome back, {session.user.name?.split(" ")[0]}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-forest-900">
              Your trips
            </h1>
          </div>
          <CreateTripModal />
        </div>

        {trips.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-saffron-100 text-saffron-600">
              <Compass className="h-7 w-7" />
            </span>
            <h2 className="mt-5 font-display text-xl font-semibold text-forest-900">
              No trips yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-forest-700/70">
              Create your first trip and share the invite link with your crew to
              get everyone in sync.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip._id.toString()}
                id={trip._id.toString()}
                name={trip.name}
                destination={trip.destination}
                startDate={trip.startDate.toISOString()}
                endDate={trip.endDate.toISOString()}
                memberCount={trip.memberIds.length}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
