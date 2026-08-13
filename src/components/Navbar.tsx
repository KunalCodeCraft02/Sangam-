"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Compass } from "lucide-react";
import UserMenu from "./UserMenu";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-terracotta-100/60 bg-sand-100/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-500 text-white shadow-soft">
            <Compass className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-forest-800">
            Sangam
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-forest-700/80 transition hover:text-terracotta-600"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-forest-700/80 transition hover:text-terracotta-600"
          >
            How it works
          </Link>
          {session?.user && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-forest-700/80 transition hover:text-terracotta-600"
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-sand-200" />
          ) : session?.user ? (
            <UserMenu name={session.user.name} image={session.user.image} />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-forest-800 transition hover:text-terracotta-600 sm:block"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-forest-800"
              >
                Start Planning
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
