"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ImageOff, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { MemoryFragment } from "@/types/memory";
import { Surface } from "@/components/ui/surface";
import { getPostImageProxyUrl } from "@/lib/post-image-url";

interface FragmentsProps {
  fragments: MemoryFragment[];
  unavailable?: boolean;
}

export function Fragments({ fragments, unavailable = false }: FragmentsProps) {
  const t = useTranslations("home");
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const displayFragments = fragments.slice(0, 4);

  return (
    <Surface
      className="anim-fade-up p-5 sm:p-6"
      style={{ animationDelay: "0.16s" }}
      tone="solid"
      overlay={false}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-lg font-semibold text-foreground">{t("fragments")}</h3>
        </div>
        <Link
          href="/fragments"
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-accent"
        >
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {displayFragments.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {displayFragments.map((fragment, index) => (
            <div
              key={fragment.id}
              className={`anim-fade-scale anim-delay-${index + 1} group cursor-pointer`}
            >
              <Link href={`/fragments/${encodeURIComponent(fragment.id)}`} className="block">
                {fragment.type === "image" && fragment.imageUrl && !failedImages.has(fragment.id) ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-primary-soft/40">
                    {/* 受管图片都经同源 R2 代理，避免 Next 优化器和客户端代理的网络限制。 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPostImageProxyUrl(fragment.imageUrl)}
                      alt={fragment.text || t("imageUnavailable")}
                      loading={index < 2 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={() => {
                        setFailedImages((current) => new Set(current).add(fragment.id));
                      }}
                    />
                    {fragment.text && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                        <p className="line-clamp-2 text-xs font-light leading-relaxed text-white/90">
                          {fragment.text}
                        </p>
                      </div>
                    )}
                  </div>
                ) : fragment.type === "image" ? (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-primary-soft/30 p-3 text-center text-muted">
                    <ImageOff className="h-5 w-5 text-primary/65" />
                    <p className="text-xs leading-relaxed">{t("imageUnavailable")}</p>
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] flex-col justify-between rounded-xl border border-border bg-primary-soft/45 p-3 transition-colors duration-300 group-hover:bg-primary-soft">
                    <p className="line-clamp-4 font-serif text-xs font-light leading-relaxed tracking-wide text-foreground/85">
                      {fragment.text}
                    </p>
                    <span className="text-[10px] tracking-wider text-muted">
                      {new Date(fragment.createdAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted">{unavailable ? t("fragmentsUnavailable") : t("fragmentsEmpty")}</p>
        </div>
      )}
    </Surface>
  );
}
