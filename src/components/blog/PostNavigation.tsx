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
    <nav className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2" aria-label={t("postNavigation")}>
      {prev ? (
        <Link
          href={`/blog/${encodeURIComponent(prev.slug)}`}
          className="group flex min-h-28 items-center gap-4 rounded-surface border border-surface-border bg-background/95 px-5 py-5 shadow-[0_18px_48px_-34px_rgba(25,74,91,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-muted">{t("previousPost")}</span>
            <p className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-foreground sm:text-base">{prev.title}</p>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/blog/${encodeURIComponent(next.slug)}`}
          className="group flex min-h-28 items-center justify-end gap-4 rounded-surface border border-surface-border bg-background/95 px-5 py-5 text-right shadow-[0_18px_48px_-34px_rgba(25,74,91,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
        >
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-muted">{t("nextPost")}</span>
            <p className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-base">{next.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
