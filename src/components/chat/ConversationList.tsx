"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onClose: () => void;
}

function ConversationEntry({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
}) {
  const t = useTranslations("chat");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    const nextTitle = editValue.trim();
    if (!nextTitle || nextTitle === conversation.title) {
      setEditing(false);
      setEditValue(conversation.title);
      return;
    }
    setEditing(false);
    const success = await onRename(conversation.id, nextTitle);
    if (!success) setEditValue(conversation.title);
  }, [conversation.id, conversation.title, editValue, editing, onRename]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setEditValue(conversation.title);
  }, [conversation.title]);

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-primary-soft/60 px-2 py-2">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSave();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
          }}
          onBlur={() => void handleSave()}
          aria-label={t("conversationTitle")}
          className="min-w-0 flex-1 rounded-md border border-primary/35 bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void handleSave()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("saveTitle")}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            handleCancel();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-foreground/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("cancelRename")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex min-h-11 items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/[0.045]",
        isActive && "bg-primary-soft",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted")} />
        <span className="flex-1 truncate text-sm text-foreground">{conversation.title}</span>
      </button>
      <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setEditValue(conversation.title);
            setEditing(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("rename", { title: conversation.title })}
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          aria-label={t("delete", { title: conversation.title })}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  activeId,
  open,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onClose,
}: ConversationListProps) {
  const t = useTranslations("chat");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      aria-label={t("history")}
      className="anim-fade-in absolute left-4 top-14 z-30 w-[min(18rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-surface-border bg-surface shadow-xl"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t("history")}</h2>
        <button
          type="button"
          onClick={onNew}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("newConversation")}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted">{t("emptyHistory")}</p>
        ) : (
          conversations.map((conversation) => (
            <ConversationEntry
              key={conversation.id}
              conversation={conversation}
              isActive={activeId === conversation.id}
              onSelect={() => onSelect(conversation.id)}
              onDelete={() => onDelete(conversation.id)}
              onRename={onRename}
            />
          ))
        )}
      </div>
    </div>
  );
}
