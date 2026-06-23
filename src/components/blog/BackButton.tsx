"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";

export function BackButton() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    try {
      const referrer = document.referrer;
      if (!referrer) {
        setCanGoBack(false);
        return;
      }
      const referrerHost = new URL(referrer).host;
      const currentHost = window.location.host;
      const hasHistory = window.history.length > 1;
      setCanGoBack(referrerHost === currentHost && hasHistory);
    } catch {
      setCanGoBack(false);
    }
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push("/archive");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 3L5 8l5 5" />
      </svg>
      返回
    </button>
  );
}