"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput("");
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    });
  }, [input, isStreaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  useEffect(() => {
    resize();
  }, [input, resize]);

  const canSend = input.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="shrink-0 px-4 pb-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-[26px] border border-border bg-background shadow-sm transition-shadow",
            "focus-within:border-foreground/30 focus-within:shadow-md",
            "dark:border-border"
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息"
            rows={1}
            disabled={disabled}
            className={cn(
              "max-h-[200px] flex-1 resize-none bg-transparent px-5 py-3.5",
              "text-[15px] leading-6 text-foreground placeholder:text-muted",
              "focus:outline-none disabled:opacity-50"
            )}
          />

          {/* 发送 / 停止按钮 —— 内嵌右下角，ChatGPT 风格 */}
          <div className="absolute bottom-2 right-2">
            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-all hover:opacity-80 active:scale-95"
                title="停止生成"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95",
                  canSend
                    ? "bg-foreground text-background hover:opacity-80"
                    : "bg-muted/30 text-muted"
                )}
                title="发送"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted">
          AI 可能会出错，请核实重要信息
        </p>
      </div>
    </div>
  );
}
