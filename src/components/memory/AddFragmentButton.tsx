"use client";

import { useState, useEffect } from "react";
import { AddFragmentModal } from "./AddFragmentModal";
import { createClient } from "@/lib/supabase/browser-client";
import type { MemoryFragment } from "@/types/memory";

export function AddFragmentButton({ onAdd }: { onAdd: (fragment: MemoryFragment) => void }) {
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
        className="floating-action-safe anim-pop-in fixed right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700/50 bg-zinc-900/60 text-zinc-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-zinc-600 hover:text-zinc-200 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60"
        aria-label="添加碎片"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && <AddFragmentModal onClose={() => setIsOpen(false)} onAdd={onAdd} />}
    </>
  );
}
