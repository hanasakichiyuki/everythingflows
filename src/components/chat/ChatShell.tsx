"use client";

import { useState, useCallback } from "react";
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
  const [listOpen, setListOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const {
    conversations,
    activeConversation,
    messages,
    models,
    loading,
    isAuthenticated,
    error,
    handleNew,
    handleCreateAndSend,
    handleSelect,
    handleDelete,
    handleRename,
    handleSwitchModel,
    clearError,
    onMessagesChange,
  } = useChatState(initialConversationId);

  const onToggleList = useCallback(() => {
    setListOpen((v) => !v);
  }, []);

  const onNew = useCallback(() => {
    handleNew();
    setListOpen(false);
  }, [handleNew]);

  const onSelect = useCallback(
    (id: string) => {
      handleSelect(id);
      setListOpen(false);
    },
    [handleSelect]
  );

  const onSwitchModel = useCallback(
    (modelId: string) => {
      if (activeConversation) {
        handleSwitchModel(activeConversation.id, modelId);
      }
    },
    [activeConversation, handleSwitchModel]
  );

  // 匿名用户只显示免费模型；登录用户显示全部已配置模型
  const selectableModels = isAuthenticated
    ? models
    : models.filter((m) => m.isFree);

  const onSessionError = useCallback((message: string) => {
    setGlobalError(message);
  }, []);

  // 空状态页面发消息：创建对话 → 等 ChatPanel 挂载 → 用 pendingMessage 触发发送
  const onCreateAndSend = useCallback(
    async (firstMessage: string, modelId?: string) => {
      const conv: Conversation | null = await handleCreateAndSend(firstMessage, modelId);
      if (conv) {
        setPendingMessage(firstMessage);
      }
    },
    [handleCreateAndSend]
  );

  const onPendingMessageConsumed = useCallback(() => setPendingMessage(null), []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        open={listOpen}
        onToggle={onToggleList}
        onSelect={onSelect}
        onNew={onNew}
        onDelete={handleDelete}
        onRename={handleRename}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <ChatPanel
            key={activeConversation.id}
            conversation={activeConversation}
            initialMessages={messages}
            models={selectableModels}
            canSwitchModel={true}
            onToggleSidebar={onToggleList}
            onSwitchModel={onSwitchModel}
            onNew={onNew}
            onSessionError={onSessionError}
            onMessagesChange={onMessagesChange}
            pendingMessage={pendingMessage}
            onPendingMessageConsumed={onPendingMessageConsumed}
          />
        ) : (
          <ChatEmptyPanel
            models={selectableModels}
            canSwitchModel={true}
            onToggleSidebar={onToggleList}
            onCreateAndSend={onCreateAndSend}
          />
        )}
      </div>

      {globalError && (
        <ChatError
          message={globalError}
          onDismiss={() => setGlobalError(null)}
        />
      )}

      {error && !globalError && (
        <ChatError
          message={error.message}
          onDismiss={clearError}
        />
      )}
    </div>
  );
}
