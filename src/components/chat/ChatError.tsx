"use client";

import { X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChatErrorProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ChatError({ message, onDismiss, onRetry }: ChatErrorProps) {
  const t = useTranslations("chat");

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="anim-fade-in fixed left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      style={{
        bottom:
          "calc(1rem + var(--mobile-player-offset, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 shadow-lg">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="min-w-0 flex-1 text-sm text-destructive">{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("retry")}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("dismiss")}
          className="shrink-0 text-destructive/70 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
