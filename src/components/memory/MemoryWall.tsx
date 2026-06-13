"use client";

import { useState } from "react";
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
        <h1 className="anim-fade-up text-3xl font-light tracking-[0.2em] text-zinc-300 md:text-4xl">
          碎片
        </h1>
        <div
          className="anim-fade-in mt-4 h-px w-12 bg-zinc-700"
          style={{ animationDelay: "0.4s" }}
        />
      </header>
      {/* Masonry Grid */}
      <div className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-4">
          {fragmentsList.map((fragment, index) => (
            <div
              key={fragment.id}
              className="anim-fade-up break-inside-avoid mb-3"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.6)}s` }}
            >
              <MemoryCard
                fragment={fragment}
                onClick={() => setSelectedFragment(fragment)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="anim-fade-in flex flex-col items-center justify-center px-6 py-16 md:py-24">
        <div className="h-px w-12 bg-zinc-800" />
        <p className="mt-6 text-center text-xs font-light tracking-wider text-zinc-600">
          &ldquo;In my beginning is my end.<br />
          In my end is my beginning.&rdquo;
        </p>
      </footer>

      {/* Detail Modal */}
      {selectedFragment && (
        <FragmentDetailModal
          fragment={selectedFragment}
          onClose={() => setSelectedFragment(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
