"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyInviteLink({ tripId }: { tripId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/trip/join/${tripId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full border border-forest-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-sand-50"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-forest-600" />
          Copied
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" />
          Invite link
        </>
      )}
    </button>
  );
}
