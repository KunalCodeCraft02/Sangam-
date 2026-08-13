"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { X, IndianRupee, CloudOff, ImagePlus, Store } from "lucide-react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { useLocation } from "../LocationProvider";
import { compressImage } from "@/lib/compressImage";
import { PRICE_LOG_CATEGORIES, type PriceLogCategory } from "@/lib/priceLogCategories";
import type { WishlistItem } from "./WishlistPanel";

export default function LogPriceModal({
  wishlistItems,
  onLog,
}: {
  wishlistItems: WishlistItem[];
  onLog: (entry: {
    itemName: string;
    priceInr: number;
    lat: number;
    lng: number;
    shopName?: string;
    category: PriceLogCategory;
    imageString?: string;
  }) => Promise<{ queued: boolean }>;
}) {
  const { currentPosition } = useLocation();
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState<PriceLogCategory>("Other");
  const [imageString, setImageString] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "queued" | null>(null);

  function reset() {
    setItemName("");
    setPrice("");
    setShopName("");
    setCategory("Other");
    setImageString(null);
    setError("");
    setFeedback(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageBusy(true);
    setError("");
    try {
      setImageString(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentPosition) {
      setError("Turn on Real GPS or drop a simulated pin on the map first.");
      return;
    }
    const priceNum = Number(price);
    if (!itemName.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Enter an item name and a valid price.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await onLog({
        itemName: itemName.trim(),
        priceInr: priceNum,
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        shopName: shopName.trim() || undefined,
        category,
        imageString: imageString ?? undefined,
      });
      setFeedback(result.queued ? "queued" : "saved");
      setTimeout(close, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-saffron-600"
      >
        <IndianRupee className="h-4 w-4" />
        Log price
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-7 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-forest-900">Log a price</h2>
              <button
                onClick={close}
                className="rounded-full p-1 text-forest-500 transition hover:bg-sand-100 hover:text-forest-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {feedback ? (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-700">
                {feedback === "queued" ? (
                  <>
                    <CloudOff className="h-4 w-4 shrink-0" />
                    Saved offline — will sync automatically when you&apos;re back online.
                  </>
                ) : (
                  "Logged! Everyone can see it in the Market Feed."
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-xl bg-terracotta-100 px-4 py-2.5 text-sm text-terracotta-700">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="itemName" className={labelClass}>
                    Item name
                  </label>
                  <input
                    id="itemName"
                    required
                    list="wishlist-suggestions"
                    className={inputClass}
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Pashmina Shawl"
                    autoFocus
                  />
                  <datalist id="wishlist-suggestions">
                    {wishlistItems.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="price" className={labelClass}>
                      Price (INR)
                    </label>
                    <input
                      id="price"
                      required
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      className={inputClass}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="450"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className={labelClass}>
                      Category
                    </label>
                    <select
                      id="category"
                      className={inputClass}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PriceLogCategory)}
                    >
                      {PRICE_LOG_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="shopName" className={labelClass}>
                    Shop name / landmark (optional)
                  </label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                    <input
                      id="shopName"
                      className={inputClass + " pl-9"}
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Tibetan Market, Stall 12"
                      maxLength={120}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="photo" className={labelClass}>
                    Photo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    {imageString && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageString}
                        alt="Item preview"
                        className="h-14 w-14 shrink-0 rounded-lg border border-sand-200 object-cover"
                      />
                    )}
                    <label
                      htmlFor="photo"
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-2.5 text-sm font-medium text-forest-600 transition hover:bg-sand-50"
                    >
                      <ImagePlus className="h-4 w-4" />
                      {imageBusy ? "Processing..." : imageString ? "Change photo" : "Add a photo"}
                    </label>
                    <input
                      id="photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
                <button type="submit" disabled={submitting || imageBusy} className={primaryButtonClass}>
                  {submitting ? "Saving..." : "Save price"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
