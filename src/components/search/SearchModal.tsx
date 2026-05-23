"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { TransitionLink } from "@/components/layout/PageTransition";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  date: string;
}

export function SearchModal({
  items,
  open,
  onClose,
}: {
  items: SearchItem[];
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "description", "tags", "category"],
        threshold: 0.35,
      }),
    [items]
  );

  const results = query.trim() ? fuse.search(query).map((r) => r.item) : [];

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleSelect = () => {
    setQuery("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed left-[40%] top-[35%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white/80 p-4 shadow-2xl backdrop-blur-xl dark:bg-gray-900/80 dark:border-white/10"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("placeholder")}
                className="w-full rounded-xl border border-border bg-background/50 py-3 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">{t("noResults")}</p>
              )}
              {!query.trim() && (
                <p className="py-4 text-center text-sm text-muted">输入关键词开始搜索</p>
              )}
              <ul className="space-y-1">
                {results.map((item) => (
                  <li key={item.slug}>
                    <TransitionLink
                      href={`/blog/${encodeURIComponent(item.slug)}`}
                      onClick={handleSelect}
                      className="group block rounded-lg px-3 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <h3 className="text-sm font-medium group-hover:underline">{item.title}</h3>
                      <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
