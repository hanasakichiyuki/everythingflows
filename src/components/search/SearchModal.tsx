"use client";

import { useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  const handleSelect = () => {
    setQuery("");
    onClose();
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
        <DialogTitle className="sr-only">搜索文章</DialogTitle>
        <DialogDescription className="sr-only">
          输入标题、描述、标签或分类关键词搜索文章
        </DialogDescription>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-12 bg-background/50 pl-10 pr-12"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="清除"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
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
                <Link
                  href={`/blog/${encodeURIComponent(item.slug)}`}
                  onClick={handleSelect}
                  className="group block rounded-lg px-3 py-2 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50 dark:hover:bg-white/5"
                >
                  <h3 className="text-sm font-medium group-hover:underline">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
