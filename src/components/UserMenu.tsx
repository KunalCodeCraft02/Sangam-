"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Luggage, Settings } from "lucide-react";

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserMenu({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 transition hover:border-sand-300 hover:bg-sand-50"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name ?? "Profile"}
            className="h-8 w-8 rounded-full border border-sand-200 object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-white">
            {getInitials(name)}
          </span>
        )}
        <span className="hidden text-sm font-medium text-forest-700/80 sm:block">
          {name?.split(" ")[0]}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-forest-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-sand-200 bg-white py-1.5 shadow-card"
        >
          <Link
            href="/onboarding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-forest-700 transition hover:bg-sand-50"
          >
            <Settings className="h-4 w-4 text-forest-500" />
            Profile Settings
          </Link>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-forest-700 transition hover:bg-sand-50"
          >
            <Luggage className="h-4 w-4 text-forest-500" />
            My Trips
          </Link>
          <div className="my-1 border-t border-sand-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-terracotta-600 transition hover:bg-terracotta-50"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
