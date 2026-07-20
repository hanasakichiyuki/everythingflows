"use client";

import { useEffect } from "react";
import { X, AlertCircle } from "lucide-react";

interface ChatErrorProps {
  message: string;
  onDismiss: () => void;
}

export function ChatError({ message, onDismiss }: ChatErrorProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

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
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg dark:border-red-900/50 dark:bg-red-950/80">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
        <span className="text-sm text-red-700 dark:text-red-300">{message}</span>
        <button
          onClick={onDismiss}
          aria-label="关闭提示"
          className="ml-2 text-red-400 transition-colors hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
