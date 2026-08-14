"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MemoryFragment } from "@/types/memory";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageCanvas } from "@/components/ui/surface";
import { AddFragmentButton } from "./AddFragmentButton";
import { MemoryCard } from "./MemoryCard";

export function MemoryWall({ fragments }: { fragments: MemoryFragment[] }) {
  const t = useTranslations("fragments");
  const [addedFragments, setAddedFragments] = useState<MemoryFragment[]>([]);
  const addedIds = new Set(addedFragments.map((fragment) => fragment.id));
  const fragmentsList = [
    ...addedFragments,
    ...fragments.filter((fragment) => !addedIds.has(fragment.id)),
  ];

  const handleAdd = (fragment: MemoryFragment) => {
    setAddedFragments((current) => [fragment, ...current]);
  };

  return (
    <div className="relative">
      <AddFragmentButton onAdd={handleAdd} />
      <PageCanvas>
        <section>
          <div>
            {fragmentsList.length > 0 ? (
              <div className="columns-2 gap-3 min-[760px]:columns-3 min-[1000px]:columns-4 min-[1280px]:columns-5 sm:gap-4">
                {fragmentsList.map((fragment, index) => (
                  <div
                    key={fragment.id}
                    className="anim-fade-up mb-3 break-inside-avoid sm:mb-4"
                    style={{ animationDelay: `${Math.min(index * 0.05, 0.6)}s` }}
                  >
                    <MemoryCard fragment={fragment} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
            )}
          </div>
        </section>
      </PageCanvas>
    </div>
  );
}
