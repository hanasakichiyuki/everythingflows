"use client";

import { useState, useRef, useEffect } from "react";
import { MemoryFragment } from "@/types/memory";
import { Toast } from "@/components/ui/Toast";

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      <div
        className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="添加碎片"
        className={`anim-fade-scale relative w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all duration-300 ${
          isDragging
            ? "border-zinc-500/80 bg-zinc-800/90 shadow-zinc-500/20"
            : "border-zinc-800/60 bg-zinc-900/80"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-lg font-light tracking-wide text-zinc-200">添加碎片</h2>

        {/* Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("text")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm transition-all ${
              mode === "text"
                ? "bg-zinc-700/50 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            文字
          </button>
          <button
            onClick={() => setMode("image")}
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={mode === "text" ? "写下一段记忆... (也可直接粘贴图片)" : "（可选）为图片添加文字..."}
          className="mb-4 w-full rounded-xl border border-zinc-800/50 bg-zinc-800/30 px-4 py-3 text-sm font-light leading-relaxed text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-zinc-700"
          rows={4}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-800/50 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || (mode === "text" && !text.trim()) || (mode === "image" && !imageFile)}
            className="flex-1 rounded-lg bg-zinc-700/50 px-4 py-2 text-sm text-zinc-200 transition-all hover:bg-zinc-600/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
      </div>
      <Toast
        message={error || ""}
        isVisible={!!error}
        onClose={() => setError(null)}
        type="error"
      />
    </>
  );
}
