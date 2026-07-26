"use client";

import { useCallback, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatComposer } from "./ChatComposer";
import { ModelPicker } from "./ModelPicker";
import { ChatCapabilityNotice } from "./ChatCapabilityNotice";
import type { AvailableModel } from "@/hooks/useChatState";

interface ChatEmptyPanelProps {
  models: AvailableModel[];
  isAuthenticated: boolean;
  canSwitchModel: boolean;
  historyOpen: boolean;
  onToggleSidebar: () => void;
  onCreateAndSend: (firstMessage: string, modelId?: string) => Promise<unknown>;
}

export function ChatEmptyPanel({
  models,
  isAuthenticated,
  canSwitchModel,
  historyOpen,
  onToggleSidebar,
  onCreateAndSend,
}: ChatEmptyPanelProps) {
  const t = useTranslations("chat");
  const [sending, setSending] = useState(false);
  const [requestedModelId, setRequestedModelId] = useState("");
  const defaultModelId = models.find((model) => model.isFree)?.id ?? models[0]?.id ?? "";
  const selectedModelId = models.some((model) => model.id === requestedModelId)
    ? requestedModelId
    : defaultModelId;

  const selectedModel = models.find((model) => model.id === selectedModelId);

  const handleSend = useCallback(
    async (message: string) => {
      setSending(true);
      try {
        await onCreateAndSend(message, selectedModelId || undefined);
      } finally {
        setSending(false);
      }
    },
    [onCreateAndSend, selectedModelId],
  );

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
          <h1 className="truncate text-sm font-medium text-foreground">{t("newConversationTitle")}</h1>
        </div>

        <ModelPicker
          models={models}
          selectedModelId={selectedModelId}
          onSelect={setRequestedModelId}
          disabled={!canSwitchModel}
          showLoginHint={!isAuthenticated}
        />
      </header>

      <ChatCapabilityNotice isAuthenticated={isAuthenticated} model={selectedModel} />

      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="max-w-md text-center anim-fade-in">
          <p className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            {t("welcome")}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">{t("startPrompt")}</p>
        </div>
      </div>

      {sending && (
        <p className="px-4 pb-2 text-center text-xs text-muted" role="status">
          {t("loading")}
        </p>
      )}
      <ChatComposer onSend={handleSend} isStreaming={false} disabled={sending} />
    </div>
  );
}
