"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_MESSAGES = ["Just a moment..."];
const MESSAGE_INTERVAL_MS = 1600;
const SPOKE_COUNT = 16;

function MandalaSpinner() {
  const spokes = Array.from({ length: SPOKE_COUNT });

  return (
    <div className="relative h-20 w-20">
      <motion.svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffd98d" strokeWidth="2" strokeDasharray="4 6" />
        {spokes.map((_, i) => {
          const angle = (i * 360) / spokes.length;
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2="50"
              y2="12"
              stroke={i % 2 === 0 ? "#c1502e" : "#2d6a4f"}
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${angle} 50 50)`}
            />
          );
        })}
        <circle cx="50" cy="50" r="10" fill="#ff9933" />
        <circle cx="50" cy="50" r="10" fill="none" stroke="#7a3117" strokeWidth="1.5" />
      </motion.svg>
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="50" cy="50" r="28" fill="none" stroke="#337c5c" strokeWidth="1.5" strokeDasharray="2 5" />
      </motion.svg>
    </div>
  );
}

// Real progress isn't known for these async calls, so ease toward (but never
// quite reach) 100% — the overlay unmounting is what signals "done". Mounted
// only while the overlay is visible, so its percent naturally starts at 0
// every time a new async operation begins.
function ProgressPercent() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((p) => (p >= 95 ? 95 : p + Math.max(1, Math.round((100 - p) / 10))));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return <p className="text-sm font-bold tabular-nums text-saffron-600">{percent}%</p>;
}

export default function LoadingOverlay({
  visible,
  message,
  messages,
}: {
  visible: boolean;
  message?: string;
  messages?: string[];
}) {
  const list = message ? [message] : messages && messages.length > 0 ? messages : DEFAULT_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible || list.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible, list.length]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-forest-950/55 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 rounded-3xl border border-sand-200 bg-white px-10 py-9 shadow-2xl"
          >
            <MandalaSpinner />
            <AnimatePresence mode="wait">
              <motion.p
                key={list[index % list.length]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-balance max-w-[220px] text-center text-sm font-semibold text-forest-800"
              >
                {list[index % list.length]}
              </motion.p>
            </AnimatePresence>
            <ProgressPercent />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
