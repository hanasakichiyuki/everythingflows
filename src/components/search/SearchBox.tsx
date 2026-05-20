"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";

export interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  date: string;
}

export function SearchBox({ items }: { items: SearchItem[] }) {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "description", "tags", "category"],
        threshold: 0.35,
      }),
    [items]
  );

  const results = query.trim() ? fuse.search(query).map((r) => r.item) : [];

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {query.trim() && results.length === 0 && (
        <p className="text-muted">{t("noResults")}</p>
      )}
      <ul className="space-y-4">
        {results.map((item) => (
          <li key={item.slug}>
            <Link href={`/blog/${item.slug}`} className="group block">
              <h3 className="font-medium group-hover:underline">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
