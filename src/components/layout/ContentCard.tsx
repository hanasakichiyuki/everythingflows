"use client";

import { motion } from "framer-motion";

export function ContentCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="relative -mx-6 -my-8 px-6 py-8 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="relative rounded-2xl border border-white/40 bg-white/60 px-8 py-10 shadow-lg  dark:border-white/10 dark:bg-gray-900/50 sm:px-14">
        <div className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-gray-900/30 pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  );
}
