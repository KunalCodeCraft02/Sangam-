"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, AlertCircle, Link2, Check, PartyPopper, MapPin, Loader2 } from "lucide-react";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

interface PlaceSuggestion {
  placeId: number;
  name: string;
  lat: number;
  lng: number;
}

const SEARCH_DEBOUNCE_MS = 350;

export default function CreateTripModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const skipNextSearch = useRef(false);

  function reset() {
    setName("");
    setDestination("");
    setDestCoords(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setStartDate("");
    setEndDate("");
    setError("");
    setInviteLink("");
    setCopied(false);
  }

  function closeModal() {
    setOpen(false);
    reset();
    router.refresh();
  }

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = destination.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(res.ok ? data.results : []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [destination]);

  function handleSelectSuggestion(place: PlaceSuggestion) {
    skipNextSearch.current = true;
    setDestination(place.name);
    setDestCoords({ lat: place.lat, lng: place.lng });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let coords = destCoords;
    let placeName = destination;

    if (!coords) {
      setLoading(true);
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(destination.trim())}`);
      const data = await res.json();
      const match: PlaceSuggestion | undefined = res.ok ? data.results?.[0] : undefined;
      if (!match) {
        setError("Couldn't find that destination — try picking a suggestion from the list");
        setLoading(false);
        return;
      }
      coords = { lat: match.lat, lng: match.lng };
      placeName = match.name;
    }

    setLoading(true);

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        destination: placeName,
        destLat: coords.lat,
        destLng: coords.lng,
        startDate,
        endDate,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    setInviteLink(`${window.location.origin}/trip/join/${data.id}`);
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-saffron-600"
      >
        <Plus className="h-4 w-4" />
        Create Trip
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-7 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-forest-900">
                {inviteLink ? "Trip created!" : "Create a trip"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-forest-500 transition hover:bg-sand-100 hover:text-forest-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteLink ? (
              <div className="mt-6">
                <div className="flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm text-forest-700">
                  <PartyPopper className="h-4 w-4 shrink-0 text-forest-600" />
                  Share this link so your crew can join instantly.
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-sand-300 bg-sand-50 px-3 py-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-forest-500" />
                  <span className="flex-1 truncate text-sm text-forest-800">{inviteLink}</span>
                </div>

                <div className="mt-5 flex gap-3">
                  <button onClick={handleCopy} className={secondaryButtonClass + " flex-1"}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" /> Copy link
                      </>
                    )}
                  </button>
                  <button onClick={closeModal} className={primaryButtonClass + " flex-1"}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-terracotta-100 px-4 py-3 text-sm text-terracotta-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="tripName" className={labelClass}>
                    Trip name
                  </label>
                  <input
                    id="tripName"
                    required
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Goa Squad Trip"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="destination" className={labelClass}>
                    Destination
                  </label>
                  <div className="relative">
                    <input
                      id="destination"
                      required
                      autoComplete="off"
                      className={inputClass}
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setDestCoords(null);
                      }}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Search any place — Goa, Kyoto, Paris..."
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-forest-400" />
                    )}
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-sand-200 bg-white shadow-card">
                      {suggestions.map((place) => (
                        <li key={place.placeId}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSuggestion(place)}
                            className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-forest-800 transition hover:bg-sand-50"
                          >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600" />
                            <span className="line-clamp-2">{place.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="startDate" className={labelClass}>
                      Start date
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      required
                      className={inputClass}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className={labelClass}>
                      End date
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      required
                      min={startDate || undefined}
                      className={inputClass}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  {loading ? "Creating..." : "Create trip"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
