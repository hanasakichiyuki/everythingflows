"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<boolean>;
}

function ConversationEntry({
  conv,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(conv.title);
    setEditing(true);
  }, [conv.title]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === conv.title) {
      setEditing(false);
      setEditValue(conv.title);
      return;
    }
    setEditing(false);
    const success = await onRename(conv.id, trimmed);
    if (!success) {
      setEditValue(conv.title);
    }
  }, [editing, editValue, conv.id, conv.title, onRename]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setEditValue(conv.title);
  }, [conv.title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-white/50 px-2 py-2 dark:bg-black/30">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 rounded-md border border-pink-400/50 bg-white/80 px-2 py-1 text-sm text-foreground focus:outline-none dark:border-pink-600/50 dark:bg-black/40"
        />
        <button
          onClick={handleSave}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-green-500 transition-colors hover:bg-green-500/20"
          title="保存"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleCancel();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-white/20"
          title="取消"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors",
        "hover:bg-white/40 dark:hover:bg-white/10",
        isActive && "bg-pink-500/15 dark:bg-pink-500/20"
      )}
    >
      <MessageSquare
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-pink-500" : "text-foreground/50"
        )}
      />
      <span className="flex-1 truncate text-sm text-foreground">
        {conv.title}
      </span>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleStartEdit}
          className="flex h-6 w-6 items-center justify-center rounded text-foreground/50 transition-colors hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10"
          title="重命名"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-foreground/50 transition-colors hover:bg-red-500/20 hover:text-red-500"
          title="删除"
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
  onToggle,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationListProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="anim-fade-in absolute left-4 top-14 z-30 w-72 overflow-hidden rounded-xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/20 px-4 py-3 dark:border-white/5">
        <h2 className="text-sm font-medium text-foreground">对话历史</h2>
        <button
          onClick={onNew}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-white/40 text-foreground transition-all hover:bg-white/60 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          title="新建对话"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted">
            还没有对话
          </p>
        ) : (
          conversations.map((conv) => (
            <ConversationEntry
              key={conv.id}
              conv={conv}
              isActive={activeId === conv.id}
              onSelect={() => onSelect(conv.id)}
              onDelete={() => onDelete(conv.id)}
              onRename={onRename}
            />
          ))
        )}
      </div>
    </div>
  );
}
