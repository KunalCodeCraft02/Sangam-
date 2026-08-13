"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Leaf, Flame, ShieldAlert } from "lucide-react";
import { primaryButtonClass } from "@/lib/ui";

const DIET_OPTIONS = [
  { value: "veg", label: "Vegetarian" },
  { value: "non-veg", label: "Non-Vegetarian" },
  { value: "jain", label: "Jain" },
  { value: "vegan", label: "Vegan" },
] as const;

const SPICE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const ALLERGY_OPTIONS = [
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Gluten",
  "Soy",
  "Shellfish",
  "Eggs",
];

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { update } = useSession();

  const [dietType, setDietType] = useState<string>("");
  const [spiceTolerance, setSpiceTolerance] = useState<string>("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleAllergy(allergy: string) {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!dietType || !spiceTolerance) {
      setError("Please select a diet type and spice tolerance");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietType, spiceTolerance, allergies }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    await update({ onboardingComplete: true });
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-warm-gradient bg-noise px-6 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron-300/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-terracotta-700 shadow-soft">
            <Leaf className="h-3.5 w-3.5" />
            One-time setup
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold text-forest-900">
            Tell us how you eat
          </h1>
          <p className="mt-2 text-sm text-forest-700/70">
            We&apos;ll use this to coordinate food orders across every trip you join —
            set it once, never repeat yourself again.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-sand-200 bg-white/90 p-8 shadow-card backdrop-blur-sm"
        >
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-terracotta-100 px-4 py-3 text-sm text-terracotta-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest-800">
              <Leaf className="h-4 w-4 text-forest-600" />
              Diet type
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DIET_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
                    dietType === opt.value
                      ? "border-forest-500 bg-forest-50 text-forest-800 shadow-soft"
                      : "border-sand-300 bg-white text-forest-700/70 hover:border-forest-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="dietType"
                    value={opt.value}
                    checked={dietType === opt.value}
                    onChange={(e) => setDietType(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest-800">
              <ShieldAlert className="h-4 w-4 text-terracotta-600" />
              Allergies
              <span className="font-normal text-forest-500">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((allergy) => (
                <label
                  key={allergy}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    allergies.includes(allergy)
                      ? "border-terracotta-500 bg-terracotta-50 text-terracotta-700"
                      : "border-sand-300 bg-white text-forest-700/70 hover:border-terracotta-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allergies.includes(allergy)}
                    onChange={() => toggleAllergy(allergy)}
                    className="sr-only"
                  />
                  {allergy}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest-800">
              <Flame className="h-4 w-4 text-saffron-600" />
              Spice tolerance
            </legend>
            <div className="grid grid-cols-3 gap-3">
              {SPICE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
                    spiceTolerance === opt.value
                      ? "border-saffron-500 bg-saffron-50 text-saffron-700 shadow-soft"
                      : "border-sand-300 bg-white text-forest-700/70 hover:border-saffron-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="spiceTolerance"
                    value={opt.value}
                    checked={spiceTolerance === opt.value}
                    onChange={(e) => setSpiceTolerance(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? "Saving..." : "Save & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
