"use client";

import { LogIn, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AvailableModel } from "@/hooks/useChatState";

export function ChatCapabilityNotice({
  isAuthenticated,
  model,
}: {
  isAuthenticated: boolean;
  model?: AvailableModel;
}) {
  const t = useTranslations("chat");
  const modelName = model?.name ?? t("selectModel");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-primary-soft/35 px-4 py-2.5 text-xs leading-5 text-muted"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1">
        {isAuthenticated
          ? t("signedIn", { model: modelName })
          : model
            ? t("anonymousWithModel", { model: modelName })
            : t("anonymous")}
      </p>
      {!isAuthenticated && (
        <Link
          href="/login"
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogIn className="h-3.5 w-3.5" aria-hidden />
          {t("signIn")}
        </Link>
      )}
    </div>
  );
}
