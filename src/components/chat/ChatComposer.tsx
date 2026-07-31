"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 4000;

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
  const t = useTranslations("chat");
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const message = input.trim();
    if (!message || isStreaming || disabled) return;
    onSend(message);
    setInput("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }, [disabled, input, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  useEffect(() => {
    resize();
  }, [input, resize]);

  const canSend = input.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-[26px] border border-border bg-background shadow-sm transition-shadow",
            "focus-within:border-primary/40 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/30",
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("messagePlaceholder")}
            aria-label={t("messageLabel")}
            aria-describedby="chat-composer-hint"
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            disabled={disabled}
            className="max-h-[200px] flex-1 resize-none bg-transparent py-3.5 pl-5 pr-14 text-[15px] leading-6 text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
          />

          <div className="absolute bottom-2 right-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-[transform,opacity,background-color,color] hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100"
                aria-label={t("stop")}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-[transform,opacity,background-color,color] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100",
                  canSend
                    ? "bg-foreground text-background hover:opacity-80"
                    : "bg-muted/30 text-muted",
                )}
                aria-label={t("send")}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p id="chat-composer-hint" className="mt-2 text-center text-xs text-muted">
          {isStreaming ? t("generating") : t("composerHint")}
        </p>
      </div>
    </div>
  );
}
