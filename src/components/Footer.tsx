import Link from "next/link";
import { Compass } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-terracotta-100 bg-forest-900 text-sand-100">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron-500 text-white">
              <Compass className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold">Sangam</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-sand-200/80">
            <Link href="#features" className="transition hover:text-saffron-300">
              Features
            </Link>
            <Link href="#how-it-works" className="transition hover:text-saffron-300">
              How it works
            </Link>
            <Link href="/login" className="transition hover:text-saffron-300">
              Login
            </Link>
            <Link href="/register" className="transition hover:text-saffron-300">
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-sand-100/10 pt-6 text-center text-xs text-sand-200/60">
          © {new Date().getFullYear()} Sangam. Made for travelers who explore
          incredible India together.
        </div>
      </div>
    </footer>
  );
}
