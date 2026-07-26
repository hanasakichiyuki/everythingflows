"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PanelLeft, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";
import { ModelPicker } from "./ModelPicker";
import { ChatError } from "./ChatError";
import { ChatCapabilityNotice } from "./ChatCapabilityNotice";
import { createMessageAction } from "@/app/actions/chat";
import type { AvailableModel } from "@/hooks/useChatState";
import type { Conversation, Message } from "@/types/chat";

interface ChatPanelProps {
  conversation: Conversation;
  initialMessages: Message[];
  models: AvailableModel[];
  isAuthenticated: boolean;
  canSwitchModel: boolean;
  historyOpen: boolean;
  messagesLoading: boolean;
  onToggleSidebar: () => void;
  onSwitchModel: (modelId: string) => void;
  onMessagesChange?: (messages: Message[]) => void;
  pendingMessage?: string | null;
  onPendingMessageConsumed?: () => void;
}

function toUIMessages(messages: Message[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  }));
}

function getTextContent(message: UIMessage): string {
  return message.parts?.find((part) => part.type === "text")?.text ?? "";
}

export function ChatPanel({
  conversation,
  initialMessages,
  models,
  isAuthenticated,
  canSwitchModel,
  historyOpen,
  messagesLoading,
  onToggleSidebar,
  onSwitchModel,
  onMessagesChange,
  pendingMessage,
  onPendingMessageConsumed,
}: ChatPanelProps) {
  const t = useTranslations("chat");
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

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

  const initialCreatedAtMap = useMemo(() => {
    const createdAt = new Map<string, string>();
    for (const message of initialMessages) createdAt.set(message.id, message.createdAt);
    return createdAt;
  }, [initialMessages]);

  const formatError = useCallback(
    (error: Error) => {
      if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
        return t("networkError");
      }
      return error.message || t("genericError");
    },
    [t],
  );

  const { messages, sendMessage, status, stop, regenerate, error, setMessages } = useChat({
    id: conversation.id,
    transport,
    messages: initialUIMessages,
    onError: (streamError) => setCallbackError(formatError(streamError)),
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const selectedModel = models.find((model) => model.id === conversation.modelId);

  useEffect(() => {
    if (initialUIMessages.length > 0 && messages.length === 0 && !isStreaming) {
      setMessages(initialUIMessages);
    }
  }, [initialUIMessages, isStreaming, messages.length, setMessages]);

  const errorKey = error ? formatError(error) : callbackError;
  const localError = errorKey && errorKey !== dismissedErrorKey ? errorKey : null;

  const displayMessages: Message[] = useMemo(
    () =>
      messages
        .filter((message) => {
          if (message.role === "system") return false;
          return !(message.role === "assistant" && !getTextContent(message) && isStreaming);
        })
        .map((message) => ({
          id: message.id,
          conversationId: conversation.id,
          role: message.role as "user" | "assistant",
          content: getTextContent(message),
          modelId: message.role === "assistant" ? conversation.modelId : null,
          createdAt: initialCreatedAtMap.get(message.id) ?? new Date().toISOString(),
        })),
    [conversation.id, conversation.modelId, initialCreatedAtMap, isStreaming, messages],
  );

  useEffect(() => {
    onMessagesChange?.(displayMessages);
  }, [displayMessages, onMessagesChange]);

  const handleSend = useCallback(
    async (content: string) => {
      setDismissedErrorKey(null);
      setCallbackError(null);
      setPersistenceWarning(null);
      sendMessage({ text: content });
      if (!isAuthenticated) return;

      try {
        const result = await createMessageAction({
          conversationId: conversation.id,
          role: "user",
          content,
        });
        if (!result.ok) setPersistenceWarning(t("messageNotSaved"));
      } catch {
        setPersistenceWarning(t("messageNotSaved"));
      }
    },
    [conversation.id, isAuthenticated, sendMessage, t],
  );

  useEffect(() => {
    if (!pendingMessage || !onPendingMessageConsumed) return;
    const frame = requestAnimationFrame(() => {
      void handleSend(pendingMessage);
      onPendingMessageConsumed();
    });
    return () => cancelAnimationFrame(frame);
  }, [handleSend, onPendingMessageConsumed, pendingMessage]);

  const handleRegenerate = useCallback(() => {
      setDismissedErrorKey(null);
      setCallbackError(null);
      setPersistenceWarning(null);
      regenerate();
  }, [regenerate]);

  const hasMessages = displayMessages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          id="chat-history-trigger"
          aria-haspopup="dialog"
          aria-expanded={historyOpen}
          aria-controls="chat-history-dialog"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("openHistory")}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium text-foreground">{conversation.title}</h1>
        </div>

        <ModelPicker
          models={models}
          selectedModelId={conversation.modelId}
          onSelect={onSwitchModel}
          disabled={!canSwitchModel}
          showLoginHint={!isAuthenticated}
        />
      </header>

      <ChatCapabilityNotice isAuthenticated={isAuthenticated} model={selectedModel} />

      <MessageList
        messages={displayMessages}
        isStreaming={isStreaming}
        historyLoading={messagesLoading}
        onRegenerate={handleRegenerate}
        showWelcome={!hasMessages && !isStreaming}
      />

      <ChatComposer
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={models.length === 0 || messagesLoading}
      />

      {(localError || persistenceWarning) && (
        <ChatError
          message={localError ?? persistenceWarning ?? t("genericError")}
          onDismiss={() => {
            if (localError) setDismissedErrorKey(errorKey);
            else setPersistenceWarning(null);
          }}
          onRetry={localError && !isStreaming ? handleRegenerate : undefined}
        />
      )}

      {models.length === 0 && (
        <div className="shrink-0 border-t border-border bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          <Sparkles className="mr-1 inline h-3 w-3" />
          {t("modelUnavailable")} {t("modelUnavailableHelp")}
        </div>
      )}
    </div>
  );
}
