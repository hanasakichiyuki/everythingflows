"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AddFragmentModal } from "./AddFragmentModal";
import { createClient } from "@/lib/supabase/browser-client";
import { MemoryFragment } from "@/types/memory";

export function AddFragmentButton({ onAdd }: { onAdd: (fragment: MemoryFragment) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (!isMounted) return null;
  if (!isAuthenticated) return null;

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-24 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700/50 bg-zinc-900/60 text-zinc-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-zinc-600 hover:text-zinc-200 hover:shadow-xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        aria-label="添加碎片"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && <AddFragmentModal onClose={() => setIsOpen(false)} onAdd={onAdd} />}
      </AnimatePresence>
    </>
  );
}
