"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchResultList } from "./SearchResultList";
import type { SearchItem } from "./types";

export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [items, setItems] = useState<SearchItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || hasLoaded) return;
    const controller = new AbortController();
    const loadItems = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/search", { signal: controller.signal });
        if (!response.ok) throw new Error("search index unavailable");
        const payload = (await response.json()) as { items?: unknown };
        if (!Array.isArray(payload.items)) throw new Error("invalid search index");
        setItems(payload.items);
        setHasLoaded(true);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") setError(t("loadError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadItems();
    return () => controller.abort();
  }, [hasLoaded, open, t]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "description", "tags", "category"],
        threshold: 0.35,
      }),
    [items]
  );

  const results = query.trim() ? fuse.search(query).map((r) => r.item) : [];

  const handleSelect = () => {
    setQuery("");
    setActiveIndex(-1);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((value) => (value + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((value) => (value <= 0 ? results.length - 1 : value - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      router.push(`/blog/${encodeURIComponent(results[activeIndex].slug)}`);
      handleSelect();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setQuery("");
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/20"
        className="left-1/2 top-4 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 translate-y-0 border-white/20 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80 md:top-[20%]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t("modalTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("modalDescription")}
        </DialogDescription>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="h-12 bg-background/50 pl-10 pr-12"
            aria-controls="search-modal-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clear")}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div id="search-modal-results" className="max-h-[60vh] overflow-y-auto" aria-live="polite">
          {loading && <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" />{t("loading")}</p>}
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">{error}</p>}
          {query.trim() && !error && results.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">{t("noResults")}</p>
          )}
          {!query.trim() && !loading && !error && (
            <p className="py-6 text-center text-sm text-muted">{t("hint")}</p>
          )}
          {results.length > 0 && <SearchResultList results={results} query={query} activeIndex={activeIndex} onSelect={handleSelect} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
