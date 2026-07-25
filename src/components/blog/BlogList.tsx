"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostMeta } from "@/types";
import { PostCard } from "./PostCard";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 8;

export function BlogList({ posts }: { posts: PostMeta[] }) {
  const t = useTranslations("blog");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .slice(0, 12);
  }, [posts]);

  const filteredPosts = activeTag
    ? posts.filter((post) => post.tags.includes(activeTag))
    : posts;
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectTag = (tag: string | null) => {
    setActiveTag(tag);
    setPage(1);
  };

  if (posts.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div>
      {tagCounts.length > 0 && (
        <div className="mb-7 flex items-start gap-3">
          <SlidersHorizontal className="mt-2 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectTag(null)}
              aria-pressed={activeTag === null}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTag === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-primary hover:bg-primary/15"
              }`}
            >
              {t("allPosts")}
            </button>
            {tagCounts.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => selectTag(tag)}
                aria-pressed={activeTag === tag}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted hover:bg-primary-soft hover:text-primary"
                }`}
              >
                #{tag} <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {visiblePosts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {visiblePosts.map((post, index) => (
            <PostCard key={post.slug} post={post} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState title={t("filterEmptyTitle")} description={t("filterEmptyDescription")} />
      )}

      {pageCount > 1 && (
        <nav className="mt-8 flex items-center justify-between border-t border-border pt-5" aria-label={t("pagination")}> 
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("previousPage")}
          </button>
          <p className="text-sm tabular-nums text-muted">{t("pageStatus", { current: currentPage, total: pageCount })}</p>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage === pageCount}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            {t("nextPage")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
