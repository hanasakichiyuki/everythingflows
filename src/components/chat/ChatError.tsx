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
    <div className="anim-fade-in fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg dark:border-red-900/50 dark:bg-red-950/80">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
        <span className="text-sm text-red-700 dark:text-red-300">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 text-red-400 transition-colors hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
