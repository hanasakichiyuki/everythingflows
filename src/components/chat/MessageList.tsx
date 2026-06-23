"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import { ThinkingDots } from "./ThinkingDots";
import { ChatScrollbar } from "./ChatScrollbar";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate?: () => void;
  showWelcome?: boolean;
}

export function MessageList({ messages, isStreaming, onRegenerate, showWelcome }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const userNearBottomRef = useRef(true);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // 仅在「消息条数变化」时强制滚到底；流式 token 增长不触发强制滚动，
  // 但若用户当前已在底部附近则跟随滚动。
  useEffect(() => {
    const countChanged = messages.length !== prevCountRef.current;
    prevCountRef.current = messages.length;

    if (countChanged) {
      // 新消息加入：用双 rAF 确保布局完成后再滚动，避免异步渲染（如代码高亮）导致位置偏移
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(scrollToBottom);
      });
    } else if (userNearBottomRef.current) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);

  // 监听用户滚动，判断是否在底部附近（用于决定流式时是否跟随）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 80;
      userNearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  // ResizeObserver：内容高度变化时（如代码高亮、图片加载），若用户在底部则保持底部
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (userNearBottomRef.current) {
        scrollToBottom();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full overflow-y-auto">
          <div className="flex h-full items-center justify-center px-6">
            <div className="text-center anim-fade-in">
              <p className="text-2xl font-medium text-foreground">
                {showWelcome ? "有什么可以帮你的？" : "发送一条消息开始对话"}
              </p>
            </div>
          </div>
        </div>
        <ChatScrollbar scrollRef={containerRef} />
      </div>
    );
  }

  // 找到最后一条 assistant 消息的 id，用于显示"重新生成"按钮
  let lastAssistantId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantId = messages[i].id;
      break;
    }
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} className="h-full overflow-y-auto">
        <div className="py-4 pr-3">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              role={msg.role}
              content={msg.content}
              modelName={msg.modelId}
              onRegenerate={!isStreaming ? onRegenerate : undefined}
              isLastAssistant={msg.id === lastAssistantId}
            />
          ))}
          {isStreaming && (messages.length === 0 || messages[messages.length - 1].role !== "assistant") && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatScrollbar scrollRef={containerRef} />
    </div>
  );
}
