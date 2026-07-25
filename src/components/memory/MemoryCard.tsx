"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import type { MemoryFragment } from "@/types/memory";
import { FragmentImage } from "./FragmentImage";

const textHeightClass: Record<MemoryFragment["height"], string> = {
  short: "min-h-32",
  medium: "min-h-48",
  tall: "min-h-64",
};

export function MemoryCard({ fragment }: { fragment: MemoryFragment }) {
  const t = useTranslations("fragments");
  const heightClass = textHeightClass[fragment.height];
  const date = formatDate(fragment.createdAt, "zh-CN");
  const href = `/fragments/${encodeURIComponent(fragment.id)}`;

  return (
    <article>
      <Link
        href={href}
        aria-label={t("viewFragment")}
        className="group block overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_42px_-32px_rgba(25,74,91,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
      >
        {fragment.type === "image" ? (
          <div className="relative">
            <FragmentImage
              src={fragment.imageUrl}
              alt={fragment.text || t("imageAlt")}
              unavailableLabel={t("imageUnavailable")}
              className="min-h-32 w-full"
              imageClassName="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
            />
            {fragment.text && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
                <p className="line-clamp-2 text-sm leading-6 text-white/95">{fragment.text}</p>
              </div>
            )}
            <time className="absolute right-2 top-2 rounded-full bg-black/35 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm sm:right-3 sm:top-3" dateTime={fragment.createdAt}>
              {date}
            </time>
          </div>
        ) : (
          <div className={`flex ${heightClass} flex-col justify-between bg-primary-soft/30 p-3.5 sm:p-5`}>
            <p className="line-clamp-8 whitespace-pre-wrap font-serif text-[13px] leading-6 tracking-wide text-foreground sm:text-[15px] sm:leading-7">
              {fragment.text}
            </p>
            <time className="mt-5 text-[11px] text-muted" dateTime={fragment.createdAt}>{date}</time>
          </div>
        )}
      </Link>
    </article>
  );
}
