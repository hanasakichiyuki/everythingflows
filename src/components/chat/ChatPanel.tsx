"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useCallback, useState, useEffect } from "react";
import { PanelLeft, Sparkles } from "lucide-react";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";
import { ModelPicker } from "./ModelPicker";
import { ChatError } from "./ChatError";
import { createMessageAction } from "@/app/actions/chat";
import type { AvailableModel } from "@/hooks/useChatState";
import type { Conversation, Message } from "@/types/chat";

interface ChatPanelProps {
  conversation: Conversation;
  initialMessages: Message[];
  models: AvailableModel[];
  canSwitchModel: boolean;
  onToggleSidebar: () => void;
  onSwitchModel: (modelId: string) => void;
  onSessionError: (message: string) => void;
  onMessagesChange?: (messages: Message[]) => void;
  pendingMessage?: string | null;
  onPendingMessageConsumed?: () => void;
}

function toUIMessages(messages: Message[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  }));
}

function getTextContent(message: UIMessage): string {
  const textPart = message.parts?.find((p) => p.type === "text");
  return textPart?.text ?? "";
}

export function ChatPanel({
  conversation,
  initialMessages,
  models,
  canSwitchModel,
  onToggleSidebar,
  onSwitchModel,
  onSessionError,
  onMessagesChange,
  pendingMessage,
  onPendingMessageConsumed,
}: ChatPanelProps) {
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        credentials: "include",
        body: { conversationId: conversation.id, modelId: conversation.modelId },
      }),
    [conversation.id, conversation.modelId],
  );

  const initialUIMessages = useMemo(
    () => toUIMessages(initialMessages),
    [initialMessages],
  );

  // 历史消息的 createdAt 映射，用于 displayMessages 保持原始时间戳
  const initialCreatedAtMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const msg of initialMessages) {
      m.set(msg.id, msg.createdAt);
    }
    return m;
  }, [initialMessages]);

  const { messages, sendMessage, status, stop, regenerate, error, setMessages } = useChat({
    id: conversation.id,
    transport,
    messages: initialUIMessages,
    onError: (err) => {
      setCallbackError(err.message);
      onSessionError(err.message);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // 刷新页面时 initialMessages 可能晚于 ChatPanel 挂载到达（loadMessages 异步）。
  // useChat 只在构造时读 messages 选项，后续 prop 变化不会更新 Chat 实例。
  // 此 effect 在 chat 为空且 initialMessages 有数据时同步进去，避免历史丢失。
  useEffect(() => {
    if (initialUIMessages.length > 0 && messages.length === 0 && !isStreaming) {
      setMessages(initialUIMessages);
    }
  }, [initialUIMessages, messages.length, isStreaming, setMessages]);

  const errorKey = error?.message ?? callbackError;
  const localErrorDerived =
    errorKey && errorKey !== dismissedErrorKey ? errorKey : null;

  // 直接从 useChat 的 messages 转换 —— 排序天然正确，无需本地 state 同步
  const displayMessages: Message[] = useMemo(() => {
    return messages
      .filter((msg) => {
        if (msg.role === "system") return false;
        // 流式中的空 assistant 消息不显示（由 ThinkingDots 占位）
        if (msg.role === "assistant" && !getTextContent(msg) && isStreaming) return false;
        return true;
      })
      .map((msg) => ({
        id: msg.id,
        conversationId: conversation.id,
        role: msg.role as "user" | "assistant",
        content: getTextContent(msg),
        modelId: msg.role === "assistant" ? conversation.modelId : null,
        createdAt: initialCreatedAtMap.get(msg.id) ?? new Date().toISOString(),
      }));
  }, [messages, isStreaming, conversation.id, conversation.modelId, initialCreatedAtMap]);

  // 报告消息变化给 useChatState（匿名用户写入 localStorage）
  useEffect(() => {
    onMessagesChange?.(displayMessages);
  }, [displayMessages, onMessagesChange]);

  const handleSend = useCallback(
    async (content: string) => {
      setDismissedErrorKey(null);
      sendMessage({ text: content });
      // 后台异步保存到数据库（不阻塞 UI）
      try {
        const result = await createMessageAction({
          conversationId: conversation.id,
          role: "user",
          content,
        });
        if (!result.ok) {
          console.error("保存消息失败:", result.error);
        }
      } catch (e) {
        console.error("保存消息失败:", e instanceof Error ? e.message : e);
      }
    },
    [sendMessage, conversation.id],
  );

  // 空状态页面发消息后：ChatPanel 挂载，发送 pendingMessage
  useEffect(() => {
    if (pendingMessage && onPendingMessageConsumed) {
      handleSend(pendingMessage);
      onPendingMessageConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  const handleRegenerate = useCallback(() => {
    setDismissedErrorKey(null);
    regenerate();
  }, [regenerate]);

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-muted/30 hover:text-foreground"
          title="对话列表"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 truncate">
          <h1 className="truncate text-sm font-medium text-foreground">
            {conversation.title}
          </h1>
        </div>

        <ModelPicker
          models={models}
          selectedModelId={conversation.modelId}
          onSelect={onSwitchModel}
          disabled={!canSwitchModel}
        />
      </header>

      <MessageList
        messages={displayMessages}
        isStreaming={isStreaming}
        onRegenerate={handleRegenerate}
        showWelcome={!hasMessages && !isStreaming}
      />

      <ChatComposer
        onSend={handleSend}
        onStop={() => stop()}
        isStreaming={isStreaming}
      />

      {localErrorDerived && (
        <ChatError
          message={localErrorDerived}
          onDismiss={() => setDismissedErrorKey(errorKey)}
        />
      )}

      {models.length === 0 && (
        <div className="shrink-0 border-t border-border bg-foreground/5 px-4 py-2 text-center text-xs text-muted">
          <Sparkles className="mr-1 inline h-3 w-3" />
          尚未配置任何 AI 模型，请在环境变量中设置 API Key
        </div>
      )}
    </div>
  );
}
