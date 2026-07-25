"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { MemoryFragment } from "@/types/memory";
import { MAX_FRAGMENT_TEXT_LENGTH } from "@/lib/fragment-validation";
import { Toast } from "@/components/ui/Toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface AddFragmentModalProps {
  onClose: () => void;
  onAdd: (fragment: MemoryFragment) => void;
}

export function AddFragmentModal({ onClose, onAdd }: AddFragmentModalProps) {
  const t = useTranslations("fragments");
  const [mode, setMode] = useState<"image" | "text">("text");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setMode("image");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
        break;
      }
    }
  };

  const handleSubmit = async () => {
    if (mode === "text" && !text.trim()) return;
    if (mode === "image" && !imageFile) return;

    setUploading(true);
    setError(null);

    try {
      let imageUrl: string | undefined;

      if (mode === "image" && imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || t("uploadError"));
        }
        
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          imageUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/fragments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          text: text.trim() || undefined,
          imageUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t("createError"));
      }

      const data = await res.json();
      const fragment: MemoryFragment = {
        id: data.data.id,
        type: data.data.type,
        imageUrl: data.data.image_url || undefined,
        text: data.data.text || undefined,
        width: data.data.width,
        height: data.data.height,
        createdAt: data.data.created_at,
      };
      onAdd(fragment);
      onClose();
    } catch (err) {
      console.error("Failed to add fragment:", err);
      const errorMessage = err instanceof Error ? err.message : t("createError");
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !uploading) onClose();
        }}
      >
      <DialogContent
        overlayClassName="bg-black/25"
        className={`max-w-md border-surface-border bg-surface p-6 text-foreground ${
          isDragging
            ? "border-primary/60 bg-primary-soft"
            : ""
        }`}
        onEscapeKeyDown={(event) => {
          if (uploading) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (uploading) event.preventDefault();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogTitle className="mb-2 pr-10 font-serif text-xl font-semibold tracking-tight text-foreground">
          {t("addTitle")}
        </DialogTitle>
        <DialogDescription className="mb-6 text-sm leading-6 text-muted">{t("addDescription")}</DialogDescription>

        {/* Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("text")}
            aria-pressed={mode === "text"}
            className={`flex-1 rounded-lg px-4 py-2 text-sm transition-all ${
              mode === "text"
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-foreground/[0.045] hover:text-foreground"
            }`}
          >
            {t("textMode")}
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            aria-pressed={mode === "image"}
            className={`flex-1 rounded-lg px-4 py-2 text-sm transition-all ${
              mode === "image"
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-foreground/[0.045] hover:text-foreground"
            }`}
          >
            {t("imageMode")}
          </button>
        </div>

        {/* Image Upload */}
        {mode === "image" && (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-primary-soft/20 py-8 text-sm text-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {imagePreview ? (
                // FileReader 的 data URL 无固定尺寸，不适合交给 Next 图片优化器。
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt={t("imageAlt")} className="h-40 w-full rounded-lg object-cover" />
              ) : (
                <span>{t("selectImage")}</span>
              )}
            </button>
          </div>
        )}

        {/* Text Input */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={mode === "text" ? t("textPlaceholder") : t("imagePlaceholder")}
          aria-label={mode === "text" ? t("contentField") : t("imageCaptionField")}
          maxLength={MAX_FRAGMENT_TEXT_LENGTH}
          className="mb-4 min-h-0 border-border bg-background text-foreground placeholder:text-muted focus-visible:ring-ring"
          rows={4}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || (mode === "text" && !text.trim()) || (mode === "image" && !imageFile)}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? t("saving") : t("save")}
          </button>
        </div>
      </DialogContent>
      </Dialog>
      <Toast
        message={error || ""}
        isVisible={!!error}
        onClose={() => setError(null)}
        type="error"
      />
    </>
  );
}
