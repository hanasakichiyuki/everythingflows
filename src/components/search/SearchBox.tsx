"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { SearchResultList } from "./SearchResultList";
import type { SearchItem } from "./types";

export function SearchBox({ items }: { items: SearchItem[] }) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "description", "tags", "category"],
        threshold: 0.35,
      }),
    [items]
  );

  const results = query.trim() ? fuse.search(query).map((r) => r.item) : [];

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
    }
  };

  return (
    <section>
      <div className="relative mb-7 mt-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className="min-h-12 w-full rounded-xl border border-border bg-background px-10 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
          aria-controls="search-page-results"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        />
      </div>
      {query.trim() && results.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted">{t("noResults")}</p>
      )}
      {!query.trim() && <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted">{t("hint")}</p>}
      {results.length > 0 && <div id="search-page-results"><SearchResultList results={results} query={query} activeIndex={activeIndex} /></div>}
    </section>
  );
}
