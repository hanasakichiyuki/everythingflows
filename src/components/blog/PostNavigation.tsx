"use client";

import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostMeta } from "@/types";

type Props = {
  prev: PostMeta | null;
  next: PostMeta | null;
};

export function PostNavigation({ prev, next }: Props) {
  return (
    <nav className="mt-12 grid grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={`/blog/${encodeURIComponent(prev.slug)}`}
          className="group flex items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:border-accent"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted">{prev.title}</p>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/blog/${encodeURIComponent(next.slug)}`}
          className="group flex items-center justify-end gap-2 rounded-lg border border-border p-4 text-right transition-colors hover:border-accent"
        >
          <div className="min-w-0">
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
