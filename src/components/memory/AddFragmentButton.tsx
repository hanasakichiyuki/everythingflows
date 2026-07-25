"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddFragmentModal } from "./AddFragmentModal";
import { createClient } from "@/lib/supabase/browser-client";
import type { MemoryFragment } from "@/types/memory";

export function AddFragmentButton({ onAdd }: { onAdd: (fragment: MemoryFragment) => void }) {
  const t = useTranslations("fragments");
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="floating-action-safe anim-pop-in fixed right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
        aria-label={t("add")}
      >
        <Plus className="h-5 w-5" />
      </button>

      {isOpen && <AddFragmentModal onClose={() => setIsOpen(false)} onAdd={onAdd} />}
    </>
  );
}
