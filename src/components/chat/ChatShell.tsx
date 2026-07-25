"use client";

import { useCallback, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConversationList } from "./ConversationList";
import { ChatPanel } from "./ChatPanel";
import { ChatEmptyPanel } from "./ChatEmptyPanel";
import { ChatError } from "./ChatError";
import { useChatState } from "@/hooks/useChatState";
import type { Conversation } from "@/types/chat";

interface ChatShellProps {
  initialConversationId?: string;
}

export function ChatShell({ initialConversationId }: ChatShellProps) {
  const t = useTranslations("chat");
  const [listOpen, setListOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const {
    conversations,
    activeConversation,
    messages,
    models,
    loading,
    messagesLoading,
    isAuthenticated,
    error,
    handleNew,
    handleCreateAndSend,
    handleSelect,
    handleDelete,
    handleRename,
    handleSwitchModel,
    clearError,
    reload,
    onMessagesChange,
  } = useChatState(initialConversationId);

  const selectableModels = isAuthenticated ? models : models.filter((model) => model.isFree);

  const onToggleList = useCallback(() => setListOpen((open) => !open), []);

  const onNew = useCallback(() => {
    handleNew();
    setListOpen(false);
  }, [handleNew]);

  const onSelect = useCallback(
    (id: string) => {
      handleSelect(id);
      setListOpen(false);
    },
    [handleSelect],
  );

  const onSwitchModel = useCallback(
    (modelId: string) => {
      if (activeConversation) void handleSwitchModel(activeConversation.id, modelId);
    },
    [activeConversation, handleSwitchModel],
  );

  const onCreateAndSend = useCallback(
    async (firstMessage: string, modelId?: string) => {
      const conversation: Conversation | null = await handleCreateAndSend(firstMessage, modelId);
      if (conversation) setPendingMessage(firstMessage);
    },
    [handleCreateAndSend],
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted" role="status">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        open={listOpen}
        onSelect={onSelect}
        onNew={onNew}
        onDelete={handleDelete}
        onRename={handleRename}
        onClose={() => setListOpen(false)}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <ChatPanel
            key={activeConversation.id}
            conversation={activeConversation}
            initialMessages={messages}
            models={selectableModels}
            isAuthenticated={isAuthenticated}
            canSwitchModel
            messagesLoading={messagesLoading}
            onToggleSidebar={onToggleList}
            onSwitchModel={onSwitchModel}
            onMessagesChange={onMessagesChange}
            pendingMessage={pendingMessage}
            onPendingMessageConsumed={() => setPendingMessage(null)}
          />
        ) : (
          <ChatEmptyPanel
            models={selectableModels}
            isAuthenticated={isAuthenticated}
            canSwitchModel
            onToggleSidebar={onToggleList}
            onCreateAndSend={onCreateAndSend}
          />
        )}
      </div>

      {error && (
        <ChatError message={error.message} onDismiss={clearError} onRetry={reload} />
      )}
    </div>
  );
}
