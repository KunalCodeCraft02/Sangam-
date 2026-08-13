import Link from "next/link";
import { MapPin, Calendar, Users } from "lucide-react";
import CopyInviteLink from "./CopyInviteLink";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export default function TripCard({
  id,
  name,
  destination,
  startDate,
  endDate,
  memberCount,
}: {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  memberCount: number;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-sand-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-forest-900">{name}</h3>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
          <Users className="h-3 w-3" />
          {memberCount}/15
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-sm text-terracotta-600">
        <MapPin className="h-4 w-4" />
        {destination}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-forest-700/70">
        <Calendar className="h-4 w-4" />
        {dateFormatter.format(new Date(startDate))} – {dateFormatter.format(new Date(endDate))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={`/trip/${id}`}
          className="text-sm font-semibold text-forest-800 transition hover:text-terracotta-600"
        >
          View trip
        </Link>
        <CopyInviteLink tripId={id} />
      </div>
    </div>
  );
}
