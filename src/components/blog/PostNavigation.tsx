"use client";

import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostMeta } from "@/types";

type Props = {
  prev: PostMeta | null;
  next: PostMeta | null;
};

export function PostNavigation({ prev, next }: Props) {
  return (
    <nav className="mt-12 grid grid-cols-2 gap-4" aria-label="文章翻页">
      {prev ? (
        <Link
          href={`/blog/${encodeURIComponent(prev.slug)}`}
          className="group flex items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-medium tracking-wider text-muted/70">上一篇</span>
            <p className="truncate text-sm text-muted">{prev.title}</p>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/blog/${encodeURIComponent(next.slug)}`}
          className="group flex items-center justify-end gap-2 rounded-lg border border-border p-4 text-right transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
        >
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-medium tracking-wider text-muted/70">下一篇</span>
            <p className="truncate text-sm text-muted">{next.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
