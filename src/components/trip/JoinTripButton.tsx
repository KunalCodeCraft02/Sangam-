"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, UserPlus } from "lucide-react";
import { primaryButtonClass } from "@/lib/ui";

export default function JoinTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/trips/${tripId}/join`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-terracotta-100 px-4 py-3 text-sm text-terracotta-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button onClick={handleJoin} disabled={loading} className={primaryButtonClass}>
        <UserPlus className="h-4 w-4" />
        {loading ? "Joining..." : "Join this trip"}
      </button>
    </div>
  );
}
