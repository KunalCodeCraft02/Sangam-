"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Users } from "lucide-react";
import HeroCarousel from "./HeroCarousel";

export default function Hero() {
  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden">
      <HeroCarousel />

      <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col items-center justify-center px-6 py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-saffron-300/40 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-saffron-200 backdrop-blur-md"
          >
            <MapPin className="h-3.5 w-3.5" />
            Built for group trips across India
          </motion.span>

          <h1 className="text-balance mt-6 font-display text-4xl font-bold leading-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
            Experience India, Together.
            <br />
            <span className="text-saffron-300">Without the Friction.</span>
          </h1>

          <p className="text-balance mx-auto mt-6 max-w-xl text-base leading-relaxed text-sand-100/90 sm:text-lg">
            Sangam keeps your travel crew in sync — split food orders, track
            fair market prices, and find the perfect meeting point, all in
            real time. Planning a trip with friends has never felt this easy.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-saffron-500 px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:bg-saffron-600"
            >
              Start Planning
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <Users className="h-4 w-4" />
              Login
            </Link>
          </motion.div>

          <p className="mt-6 text-xs font-medium text-sand-100/70">
            Free to start · No credit card needed · Built for backpackers &amp; families alike
          </p>
        </motion.div>
      </div>
    </section>
  );
}
