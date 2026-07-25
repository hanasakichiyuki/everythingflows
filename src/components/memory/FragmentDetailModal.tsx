"use client";

import { useState } from "react";
import type { MemoryFragment } from "@/types/memory";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";

interface FragmentDetailModalProps {
  fragment: MemoryFragment;
  onClose: () => void;
  onUpdate: (fragment: MemoryFragment) => void;
  onDelete: (id: string) => void;
}

export function FragmentDetailModal({ fragment, onClose, onUpdate, onDelete }: FragmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(fragment.text || "");
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 根据内容决定弹窗宽度
  const getModalWidth = () => {
    if (fragment.type === "text") {
      const text = fragment.text || "";
      const lines = text.split("\n");
      const maxLineLen = Math.max(...lines.map(l => l.length));
      const totalLen = text.length;
      
      // 多行短行（诗歌类）：总字符多但每行短
      if (lines.length >= 4 && maxLineLen <= 15) return "max-w-md";
      // 很短的文字
      if (totalLen <= 15) return "max-w-sm";
      // 中等文字
      if (totalLen <= 40) return "max-w-md";
      return "max-w-2xl";
    }
    // 图片类型
    if (imageLoaded) {
      if (imageAspect < 0.8) return "max-w-sm"; // 竖图
      if (imageAspect > 1.5) return "max-w-4xl"; // 宽图
      return "max-w-2xl"; // 普通比例
    }
    return "max-w-3xl"; // 默认
  };

  const modalWidth = getModalWidth();

  // 判断是否居中
  const shouldCenterText = () => {
    if (fragment.type !== "text") return false;
    const text = fragment.text || "";
    const lines = text.split("\n");
    const maxLineLen = Math.max(...lines.map(l => l.length));
    // 多行短行（诗歌类）或单行很短
    if (lines.length >= 3 && maxLineLen <= 15) return true;
    return lines.length <= 1 && text.length <= 15;
  };

  const isCentered = shouldCenterText();

  const handleSave = async () => {
    const trimmedText = editText.trim() || null;
    if (trimmedText === (fragment.text || null)) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/fragments/${fragment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...fragment, text: data.data.text });
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to update fragment:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/fragments/${fragment.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(fragment.id);
        onClose();
      }
    } catch (err) {
      console.error("Failed to delete fragment:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !saving && !deleting) onClose();
        }}
      >
      <DialogContent
        overlayClassName="bg-black/85 backdrop-blur-md"
        showCloseButton={false}
        className={`max-h-[90vh] w-[90vw] ${modalWidth} overflow-y-auto rounded-3xl border-zinc-800/40 bg-zinc-900/95 p-0 text-zinc-200 backdrop-blur-xl`}
        onEscapeKeyDown={(event) => {
          if (saving || deleting) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (saving || deleting) event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">碎片详情</DialogTitle>
        <DialogDescription className="sr-only">
          查看、编辑或删除这条碎片
        </DialogDescription>

        {/* Close button */}
        <DialogClose asChild>
          <button
            type="button"
            disabled={saving || deleting}
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 transition-all duration-200 hover:rotate-90 hover:scale-105 hover:bg-zinc-700/60 hover:text-zinc-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 disabled:pointer-events-none"
            aria-label="关闭"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </DialogClose>

        {/* Content */}
        {fragment.type === "image" ? (
          <div className="anim-fade-in relative flex flex-col">
            <div className="relative flex items-center justify-center p-6">
              {/* 根据真实图片尺寸动态调整弹窗宽度，不能使用固定的 Image 宽高。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fragment.imageUrl || ""}
                alt={fragment.text || "碎片图片"}
                className="max-h-[65vh] w-auto rounded-xl object-contain shadow-lg"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setImageAspect(img.naturalWidth / img.naturalHeight);
                  setImageLoaded(true);
                }}
              />
            </div>
            {fragment.text && (
              <div className="px-8 pb-6">
                {isEditing ? (
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    aria-label="碎片文字"
                    className="min-h-0 border-zinc-700/50 bg-zinc-800/50 text-zinc-200 focus-visible:border-zinc-600 focus-visible:ring-zinc-500/40"
                    rows={3}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm font-light leading-relaxed text-zinc-300">
                    {fragment.text}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="anim-fade-in relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 via-transparent to-zinc-800/10" />
            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-zinc-700/10 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-zinc-700/10 blur-3xl" />

            {/* Quote decoration */}
            <div className="relative px-10 pt-16 pb-10 md:px-14 md:pt-20 md:pb-12">
              <span
                className={`absolute text-7xl font-serif leading-none text-zinc-700/25 md:text-8xl ${isCentered ? "left-1/2 -translate-x-1/2 top-8" : "left-10 top-8 md:left-14 md:top-12"}`}
              >
              </span>

              {isEditing ? (
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  aria-label="碎片文字"
                  className="relative min-h-0 border-zinc-700/50 bg-zinc-800/50 text-zinc-200 focus-visible:border-zinc-600 focus-visible:ring-zinc-500/40"
                  rows={8}
                />
              ) : (
                <div className={isCentered ? "text-center" : ""}>
                  <span
                    className="inline-block whitespace-pre-wrap font-light leading-[2] tracking-wide font-serif text-zinc-200 text-left text-xl md:text-2xl"
                    style={{ display: isCentered ? 'table' : undefined }}
                  >
                    {fragment.text}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom decoration */}
            <div className="relative flex items-center justify-center pb-10">
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent" />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-4 border-t border-zinc-800/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="text-xs tracking-wider text-zinc-500">
            {new Date(fragment.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditText(fragment.text || ""); }}
                  disabled={saving}
                  className="min-h-10 rounded-xl border border-zinc-700/50 px-5 py-2 text-xs tracking-wide text-zinc-400 transition-all hover:scale-105 hover:border-zinc-600 hover:text-zinc-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50 disabled:opacity-40"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="min-h-10 rounded-xl bg-zinc-700/60 px-5 py-2 text-xs tracking-wide text-zinc-200 transition-all hover:scale-105 hover:bg-zinc-600/60 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50 disabled:opacity-40"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="min-h-10 rounded-xl border border-zinc-700/50 px-5 py-2 text-xs tracking-wide text-zinc-400 transition-all hover:scale-105 hover:border-zinc-600 hover:text-zinc-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="min-h-10 rounded-xl border border-red-900/40 px-5 py-2 text-xs tracking-wide text-red-400/80 transition-all hover:scale-105 hover:border-red-800/60 hover:bg-red-900/20 hover:text-red-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                >
                  删除
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除碎片"
        message="确定要删除这条碎片吗？此操作不可撤销。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={deleting}
      />
    </>
  );
}
