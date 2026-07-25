"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AvailableModel } from "@/hooks/useChatState";

interface ModelPickerProps {
  models: AvailableModel[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
  showLoginHint?: boolean;
}

export function ModelPicker({
  models,
  selectedModelId,
  onSelect,
  disabled,
  showLoginHint,
}: ModelPickerProps) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = models.find((model) => model.id === selectedModelId);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside, open]);

  if (models.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        title={disabled ? t("modelLoginHint") : showLoginHint ? t("modelLoginHint") : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="chat-model-listbox"
        className={cn(
          "flex min-h-10 items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-foreground/80 transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        )}
      >
        {selected?.isFree && <Sparkles className="h-3 w-3 text-primary" />}
        <span className="max-w-[120px] truncate">{selected?.name ?? t("selectModel")}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && !disabled && (
        <div
          id="chat-model-listbox"
          role="listbox"
          aria-label={t("selectModel")}
          className="anim-fade-in absolute right-0 top-full z-50 mt-1 min-w-[240px] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
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
                "flex min-h-11 w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                selectedModelId === model.id && "bg-primary-soft/70",
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{model.name}</span>
                  {model.isFree && (
                    <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {t("free")}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{model.description}</p>
              </div>
              {selectedModelId === model.id && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
