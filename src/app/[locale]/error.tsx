"use client";

import { useEffect } from "react";
import { ContentCard } from "@/components/layout/ContentCard";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error("Application error:", error);
  }, [error]);

  return (
    <ContentCard>
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-semibold">出错了</h2>
        <p className="text-muted">页面加载时发生了错误</p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-w-2xl overflow-auto rounded-lg bg-black/5 p-4 text-xs dark:bg-white/5">
            {error.message}
          </pre>
        )}
        <Button onClick={reset} variant="ink" size="lg">
          重试
        </Button>
      </div>
    </ContentCard>
  );
}
