"use client";

import { useState, useCallback } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { siteConfig } from "@/config/site";
import type { ChatRole } from "@/types/chat";

interface MessageItemProps {
  role: ChatRole;
  content: string;
  modelName?: string | null;
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
}

export function MessageItem({
  role,
  content,
  modelName,
  onRegenerate,
  isLastAssistant,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  // 复制用纯文本：用户消息原样 trim；AI 消息折叠多余空行
  const copyText = isUser
    ? content.replace(/\r\n/g, "\n").trim()
    : content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [copyText]);

  // 拦截浏览器原生复制（双击选中后 Ctrl+C）：清洗选中文本中的多余空行
  // 浏览会把 <p> 的块边界/margin 转成换行，导致复制结果带 3+ 连续换行
  const handleNativeCopy = useCallback((e: React.ClipboardEvent) => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString();
    if (!text) return;
    const cleaned = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n+$/, "");
    if (cleaned !== text) {
      e.preventDefault();
      e.clipboardData?.setData("text/plain", cleaned);
    }
  }, []);

  if (role === "system") return null;

  return (
    <div
      className={`group w-full px-4 py-1.5 anim-fade-in flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[80%] gap-2.5 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* AI 头像 —— 仅 AI，左侧大头像 */}
        {!isUser && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteConfig.aiAvatar}
              alt="AI"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          <div
            onCopy={handleNativeCopy}
            className={`rounded-2xl px-4 py-2.5 ${
              isUser
                ? "bg-black text-white dark:bg-black"
                : "bg-foreground/[0.04] text-foreground dark:bg-foreground/[0.08]"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-6">
                {content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n")}
              </p>
            ) : (
              <div className="chat-prose text-[15px] font-medium leading-6">
                <MarkdownContent content={content} />
              </div>
            )}
          </div>

          {/* 操作区 —— hover 显示 */}
          <div
            className={`mt-1 flex items-center gap-3 text-muted opacity-0 transition-opacity group-hover:opacity-100 ${
              isUser ? "flex-row-reverse" : ""
            }`}
          >
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs transition-colors hover:text-foreground"
              title="复制"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {!isUser && onRegenerate && isLastAssistant && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 text-xs transition-colors hover:text-foreground"
                title="重新生成"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {!isUser && modelName && (
              <span className="font-mono text-[10px] text-muted/70">{modelName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
