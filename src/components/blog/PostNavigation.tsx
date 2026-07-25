"use client";

import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostMeta } from "@/types";

type Props = {
  prev: PostMeta | null;
  next: PostMeta | null;
};

export function PostNavigation({ prev, next }: Props) {
  const t = useTranslations("blog");

  return (
    <nav className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label={t("postNavigation")}>
      {prev ? (
        <Link
          href={`/blog/${encodeURIComponent(prev.slug)}`}
          className="group flex min-h-24 items-center gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-4 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-muted">{t("previousPost")}</span>
            <p className="truncate text-sm font-medium text-foreground">{prev.title}</p>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/blog/${encodeURIComponent(next.slug)}`}
          className="group flex min-h-24 items-center justify-end gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-4 text-right transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-muted">{t("nextPost")}</span>
            <p className="truncate text-sm font-medium text-foreground">{next.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
