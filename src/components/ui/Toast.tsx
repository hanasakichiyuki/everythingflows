"use client";

import { CheckCircle2, XCircle } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "error" | "success";
}

export function Toast({ message, isVisible, onClose, type = "error" }: ToastProps) {
  if (!isVisible) return null;
  return (
    <div
      className="fixed left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      style={{
        bottom:
          "calc(1.5rem + var(--mobile-player-offset, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        role="alert"
        aria-live={type === "error" ? "assertive" : "polite"}
        className={`anim-fade-up flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md ${
          type === "error"
            ? "border-destructive/30 bg-background/95 text-destructive"
            : "border-primary/25 bg-background/95 text-primary"
        }`}
      >
        {type === "error" ? (
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="text-sm text-foreground">
          {message}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="ml-auto text-xs text-muted transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
