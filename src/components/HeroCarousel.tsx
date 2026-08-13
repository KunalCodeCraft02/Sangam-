"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MapPin } from "lucide-react";
import { HERO_IMAGES } from "@/lib/heroImages";

const SLIDE_INTERVAL_MS = 5000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 160]);
  const scale = useTransform(scrollY, [0, 700], [1, 1.08]);

  const current = HERO_IMAGES[index];

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <AnimatePresence>
          <motion.div
            key={current.url}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${current.url})` }}
            role="img"
            aria-label={current.alt}
          />
        </AnimatePresence>
      </motion.div>

      {/* Scrim for text legibility, blending down into the page background */}
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950/75 via-forest-950/55 to-sand-100" />
      <div className="absolute inset-0 bg-gradient-to-tr from-terracotta-900/30 via-transparent to-saffron-500/15" />

      <AnimatePresence mode="wait">
        <motion.span
          key={current.location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-6 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:bottom-8"
        >
          <MapPin className="h-3.5 w-3.5 text-saffron-300" />
          {current.location}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
