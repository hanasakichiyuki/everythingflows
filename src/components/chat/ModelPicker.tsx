"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableModel } from "@/hooks/useChatState";

interface ModelPickerProps {
  models: AvailableModel[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelPicker({
  models,
  selectedModelId,
  onSelect,
  disabled,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = models.find((m) => m.id === selectedModelId);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  if (models.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        title={disabled ? "登录后可切换模型" : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="chat-model-listbox"
        className={cn(
          "flex min-h-10 items-center gap-1.5 rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50",
          "px-2 py-1 text-foreground/80 hover:bg-muted/30",
          disabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
        )}
      >
        {selected?.isFree && <Sparkles className="h-3 w-3 text-foreground/50" />}
        <span className="max-w-[120px] truncate">
          {selected?.name ?? "选择模型"}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && !disabled && (
        <div
          id="chat-model-listbox"
          role="listbox"
          aria-label="选择 AI 模型"
          className="anim-fade-in absolute right-0 top-full z-50 mt-1 min-w-[240px] overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          {models.map((model) => (
            <button
              type="button"
              key={model.id}
              role="option"
              aria-selected={selectedModelId === model.id}
              onClick={() => {
                onSelect(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex min-h-11 w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-400/50",
                selectedModelId === model.id && "bg-muted/40"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    {model.name}
                  </span>
                  {model.isFree && (
                    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground/60">
                      免费
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{model.description}</p>
              </div>
              {selectedModelId === model.id && (
                <Check className="mt-1 h-4 w-4 shrink-0 text-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
