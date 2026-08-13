"use client";

import { useState, type FormEvent } from "react";
import { Plus, X, ListChecks } from "lucide-react";
import { inputClass } from "@/lib/ui";

export interface WishlistItem {
  id: string;
  name: string;
  addedBy: string;
  createdAt: string;
}

export default function WishlistPanel({
  tripId,
  items,
  onItemsChange,
}: {
  tripId: string;
  items: WishlistItem[];
  onItemsChange: (items: WishlistItem[]) => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't add item");
      onItemsChange([data.item, ...items]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add item");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(itemId: string) {
    onItemsChange(items.filter((i) => i.id !== itemId));
    try {
      await fetch(`/api/trips/${tripId}/wishlist/${itemId}`, { method: "DELETE" });
    } catch {
      // best-effort removal; a stale item will simply reappear on next refetch
    }
  }

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
        <ListChecks className="h-4 w-4 text-terracotta-600" />
        Group wishlist
      </h2>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          className={inputClass}
          placeholder="Pashmina Shawl"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-terracotta-600">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-forest-700/60">
          No wishlist items yet — add something your crew is hunting for.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1.5 text-sm text-forest-800"
              title={`Added by ${item.addedBy}`}
            >
              {item.name}
              <button
                onClick={() => handleRemove(item.id)}
                className="text-forest-400 opacity-60 transition hover:text-terracotta-600 hover:opacity-100"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
