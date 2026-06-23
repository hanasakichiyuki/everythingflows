"use client";

import { siteConfig } from "@/config/site";

export function ThinkingDots() {
  return (
    <div className="w-full px-4 py-1.5 flex justify-start">
      <div className="flex gap-2.5">
        {/* AI 头像占位，与 MessageItem 对齐 */}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={siteConfig.aiAvatar}
            alt="AI"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex items-center px-1 py-3 text-foreground/60" aria-label="AI 正在思考">
          <span className="sr-only">AI 正在思考</span>
          <span className="flex items-end gap-1.5 h-4">
            <span className="thinking-dot" style={{ animationDelay: "0ms" }} />
            <span className="thinking-dot" style={{ animationDelay: "160ms" }} />
            <span className="thinking-dot" style={{ animationDelay: "320ms" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
