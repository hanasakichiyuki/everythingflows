"use client";

import { useState, useRef, useEffect } from "react";
import type { MemoryFragment } from "@/types/memory";
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

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "图片上传失败");
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
        throw new Error(errorData.error || "保存失败");
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
      const errorMessage = err instanceof Error ? err.message : "操作失败，请重试";
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
        overlayClassName="bg-black/60"
        className={`max-w-md border-zinc-800/60 bg-zinc-900/95 p-6 text-zinc-200 ${
          isDragging
            ? "border-zinc-500/80 bg-zinc-800/95"
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
        <DialogTitle className="mb-6 pr-10 font-light tracking-wide text-zinc-200">
          添加碎片
        </DialogTitle>
        <DialogDescription className="sr-only">
          添加文字或图片碎片
        </DialogDescription>

        {/* Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("text")}
            aria-pressed={mode === "text"}
            className={`flex-1 rounded-lg px-4 py-2 text-sm transition-all ${
              mode === "text"
                ? "bg-zinc-700/50 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            文字
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            aria-pressed={mode === "image"}
            className={`flex-1 rounded-lg px-4 py-2 text-sm transition-all ${
              mode === "image"
                ? "bg-zinc-700/50 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            图片
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
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-zinc-700/50 py-8 text-sm text-zinc-500 transition-all hover:border-zinc-600 hover:text-zinc-300"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-40 w-full rounded-lg object-cover" />
              ) : (
                <span>选择图片</span>
              )}
            </button>
          </div>
        )}

        {/* Text Input */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={mode === "text" ? "写下一段记忆... (也可直接粘贴图片)" : "（可选）为图片添加文字..."}
          aria-label={mode === "text" ? "碎片内容" : "图片说明"}
          className="mb-4 min-h-0 border-zinc-800/50 bg-zinc-800/30 text-zinc-200 placeholder:text-zinc-600 focus-visible:border-zinc-600 focus-visible:ring-zinc-500/40"
          rows={4}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-800/50 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-200"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || (mode === "text" && !text.trim()) || (mode === "image" && !imageFile)}
            className="flex-1 rounded-lg bg-zinc-700/50 px-4 py-2 text-sm text-zinc-200 transition-all hover:bg-zinc-600/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? "保存中..." : "保存"}
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
