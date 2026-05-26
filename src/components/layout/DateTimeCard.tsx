"use client";

import { motion } from "framer-motion";
import { useCurrentTime } from "@/hooks/useCurrentTime";

export function DateTimeCard() {
  const { day, month, year, weekday } = useCurrentTime();

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 shadow-lg dark:border-white/10 dark:bg-gray-900/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-gray-900/30 pointer-events-none" />
      <div className="relative z-10 text-right">
        <div className="text-5xl font-bold text-foreground/90 dark:text-foreground">
          {day}
        </div>
        <div className="mt-1 text-sm text-muted">
          {month} {year}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {weekday}
        </div>
      </div>
    </motion.div>
  );
}
