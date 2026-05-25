"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MemoryFragment } from "@/types/memory";
import { MemoryCard } from "./MemoryCard";
import { FragmentDetailModal } from "./FragmentDetailModal";
import { AddFragmentButton } from "./AddFragmentButton";

export function MemoryWall({ fragments }: { fragments: MemoryFragment[] }) {
  const [selectedFragment, setSelectedFragment] = useState<MemoryFragment | null>(null);
  const [fragmentsList, setFragmentsList] = useState(fragments);

  const handleAdd = (fragment: MemoryFragment) => {
    setFragmentsList((prev) => [fragment, ...prev]);
  };

  const handleUpdate = (updated: MemoryFragment) => {
    setFragmentsList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setSelectedFragment(updated);
  };

  const handleDelete = (id: string) => {
    setFragmentsList((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="relative min-h-screen">
      <AddFragmentButton onAdd={handleAdd} />
      {/* Header */}
      <header className="flex flex-col items-center justify-center px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-3xl font-light tracking-[0.2em] text-zinc-300 md:text-4xl"
        >
          碎片
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-4 h-px w-12 bg-zinc-700"
        />
      </header>
      {/* Masonry Grid */}
      <div className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-4">
          {fragmentsList.map((fragment, index) => (
            <motion.div
              key={fragment.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.05,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="break-inside-avoid mb-3"
            >
              <MemoryCard
                fragment={fragment}
                onClick={() => setSelectedFragment(fragment)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="flex flex-col items-center justify-center px-6 py-16 md:py-24"
      >
        <div className="h-px w-12 bg-zinc-800" />
        <p className="mt-6 text-center text-xs font-light tracking-wider text-zinc-600">
          &ldquo;In my beginning is my end.<br />
          In my end is my beginning.&rdquo;
        </p>
      </motion.footer>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedFragment && (
          <FragmentDetailModal
            fragment={selectedFragment}
            onClose={() => setSelectedFragment(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
