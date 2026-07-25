"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { MessageItem } from "./MessageItem";
import { ThinkingDots } from "./ThinkingDots";
import { ChatScrollbar } from "./ChatScrollbar";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  historyLoading: boolean;
  onRegenerate?: () => void;
  showWelcome?: boolean;
}

export function MessageList({
  messages,
  isStreaming,
  historyLoading,
  onRegenerate,
  showWelcome,
}: MessageListProps) {
  const t = useTranslations("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const userNearBottomRef = useRef(true);
  const isMountedRef = useRef(false);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  useEffect(() => {
    const countChanged = messages.length !== prevCountRef.current;
    prevCountRef.current = messages.length;
    if (countChanged) {
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(scrollToBottom);
      });
    } else if (isMountedRef.current && userNearBottomRef.current) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      userNearBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (isMountedRef.current && userNearBottomRef.current) scrollToBottom();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (historyLoading) {
    return (
      <div className="relative min-h-0 flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden />
          {t("historyLoading")}
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full overflow-y-auto">
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-md text-center anim-fade-in">
              <p className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                {showWelcome ? t("welcome") : t("startPrompt")}
              </p>
            </div>
          </div>
        </div>
        <ChatScrollbar scrollRef={containerRef} />
      </div>
    );
  }

  let lastAssistantId: string | null = null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") {
      lastAssistantId = messages[index].id;
      break;
    }
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} className="h-full overflow-y-auto">
        <div className="py-4 pr-3">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              role={message.role}
              content={message.content}
              modelName={message.modelId}
              onRegenerate={onRegenerate}
              isLastAssistant={message.id === lastAssistantId}
              isStreaming={isStreaming}
            />
          ))}
          {isStreaming && (messages.length === 0 || messages[messages.length - 1].role !== "assistant") && (
            <ThinkingDots />
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatScrollbar scrollRef={containerRef} />
    </div>
  );
}
