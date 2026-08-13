import Link from "next/link";
import { Compass } from "lucide-react";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-warm-gradient bg-noise px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-500 text-white shadow-soft">
            <Compass className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-forest-800">
            Sangam
          </span>
        </Link>

        <div className="rounded-2xl border border-sand-200 bg-white/90 p-8 shadow-card backdrop-blur-sm">
          <h1 className="text-balance font-display text-2xl font-bold text-forest-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-forest-700/70">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
