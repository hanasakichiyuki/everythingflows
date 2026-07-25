"use client";

import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";

export function ThinkingDots() {
  const t = useTranslations("chat");

  return (
    <div className="flex w-full justify-start px-4 py-1.5" role="status" aria-label={t("preparing")}>
      <div className="flex gap-2.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={siteConfig.aiAvatar} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="flex items-center px-1 py-3 text-muted">
          <span className="sr-only">{t("preparing")}</span>
          <span className="flex h-4 items-end gap-1.5" aria-hidden>
            <span className="thinking-dot" style={{ animationDelay: "0ms" }} />
            <span className="thinking-dot" style={{ animationDelay: "160ms" }} />
            <span className="thinking-dot" style={{ animationDelay: "320ms" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
