"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed, TrendingUp, MapPinned } from "lucide-react";

const features = [
  {
    icon: UtensilsCrossed,
    title: "Food Coordination",
    description:
      "Pool orders, split bills fairly, and never argue about who owes what for the group's chai and street food runs again.",
    accent: "bg-terracotta-500",
  },
  {
    icon: TrendingUp,
    title: "Market Price Tracker",
    description:
      "See fair local prices for autos, souvenirs, and stays before you haggle — crowdsourced from travelers who've been there.",
    accent: "bg-saffron-500",
  },
  {
    icon: MapPinned,
    title: "Smart Meeting Points",
    description:
      "Got a group scattered across a busy bazaar or station? Get a suggested midpoint everyone can reach, live on the map.",
    accent: "bg-forest-600",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-terracotta-600">
            Why Sangam
          </span>
          <h2 className="text-balance mt-3 font-display text-3xl font-bold text-forest-900 sm:text-4xl">
            Everything your travel crew needs, in one place
          </h2>
          <p className="mt-4 text-base text-forest-700/70">
            Three tools that quietly solve the group-travel headaches nobody
            plans for.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.12 }}
              className="group rounded-2xl border border-sand-200 bg-sand-50 p-8 shadow-card transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent} text-white shadow-soft`}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-forest-900">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-forest-700/75">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
