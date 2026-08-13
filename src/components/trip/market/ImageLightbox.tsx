"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-forest-950/80 p-4 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <motion.img
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
