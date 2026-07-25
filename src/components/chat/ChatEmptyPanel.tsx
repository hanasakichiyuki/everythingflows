"use client";

import { useState, useCallback } from "react";
import { PanelLeft } from "lucide-react";
import { ChatComposer } from "./ChatComposer";
import { ModelPicker } from "./ModelPicker";
import type { AvailableModel } from "@/hooks/useChatState";

interface ChatEmptyPanelProps {
  models: AvailableModel[];
  canSwitchModel: boolean;
  onToggleSidebar: () => void;
  onCreateAndSend: (firstMessage: string, modelId?: string) => Promise<void>;
}

export function ChatEmptyPanel({
  models,
  canSwitchModel,
  onToggleSidebar,
  onCreateAndSend,
}: ChatEmptyPanelProps) {
  const [sending, setSending] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(
    () => models.find((m) => m.isFree)?.id ?? models[0]?.id ?? ""
  );

  const handleSend = useCallback(
    async (message: string) => {
      setSending(true);
      try {
        await onCreateAndSend(message, selectedModelId);
      } finally {
        setSending(false);
      }
    },
    [onCreateAndSend, selectedModelId]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-muted/30 hover:text-foreground"
          title="对话列表"
          aria-label="打开对话列表"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 truncate">
          <h1 className="truncate text-sm font-medium text-foreground">
            新对话
          </h1>
        </div>

        <ModelPicker
          models={models}
          selectedModelId={selectedModelId}
          onSelect={setSelectedModelId}
          disabled={!canSwitchModel}
        />
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="text-center anim-fade-in">
          <p className="text-2xl font-medium text-foreground">
            有什么可以帮你的？
          </p>
        </div>
      </div>

      <ChatComposer
        onSend={handleSend}
        isStreaming={sending}
        disabled={sending}
      />
    </div>
  );
}
