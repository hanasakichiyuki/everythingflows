"use client";

import { useMemo } from "react";
import { generateHTML } from "@tiptap/core";
import { Eye, Loader2, Send } from "lucide-react";
import { createEditorExtensions } from "@/lib/editor/extensions";
import { isTiptapDocumentEmpty, type TiptapDocument } from "@/lib/editor/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type PostPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  tags: string[];
  category: string;
  contentJson: TiptapDocument;
  publishing: boolean;
  isEditMode: boolean;
  onPublish: () => void;
};

const previewExtensions = createEditorExtensions();

/**
 * 预览不需要再走净化：内容来自本机编辑器实例，节点与标记已被 TipTap schema
 * 约束（粘贴进来的 HTML 也先经 schema 解析，未知节点会被丢弃），`generateHTML`
 * 只输出白名单内的元素且会转义文本。真正对外发布时服务端还会再跑一次
 * `validateTiptapDocument`，非法链接协议在那一层被拒绝。
 */
function getPreviewHtml(contentJson: TiptapDocument) {
  if (isTiptapDocumentEmpty(contentJson)) return "";
  return generateHTML(contentJson, previewExtensions);
}

export function PostPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  tags,
  category,
  contentJson,
  publishing,
  isEditMode,
  onPublish,
}: PostPreviewDialogProps) {
  const previewHtml = useMemo(
    () =>
      typeof window === "undefined" ? "" : getPreviewHtml(contentJson),
    [contentJson]
  );
  const publishLabel = isEditMode ? "确认更新" : "确认发布";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && publishing) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="flex h-[min(100dvh-2rem,48rem)] max-w-4xl flex-col overflow-hidden p-0"
        onEscapeKeyDown={(event) => {
          if (publishing) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (publishing) event.preventDefault();
        }}
      >
        <div className="border-b border-border/60 px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3 pr-8">
            <span className="mt-0.5 rounded-lg bg-primary-soft p-2 text-primary">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>发布前预览</DialogTitle>
              <DialogDescription className="mt-1">
                这是读者将看到的内容样式；确认无误后再{isEditMode ? "更新" : "发布"}。
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-foreground/[0.018] px-4 py-5 sm:px-7 sm:py-8">
          <article className="mx-auto max-w-[42rem] rounded-[20px] border border-surface-border bg-background px-5 py-7 shadow-[0_16px_48px_-38px_rgba(25,74,91,0.42)] sm:px-9 sm:py-10">
            {category && (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {category}
              </p>
            )}
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {title.trim() || "未命名文章"}
            </h2>
            {description.trim() && (
              <p className="mt-4 border-l-2 border-primary/45 pl-3 text-sm leading-6 text-muted">
                {description.trim()}
              </p>
            )}
            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-8 border-t border-border/60 pt-7">
              <div
                className="prose-blog"
                data-rich-content
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </article>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-background px-5 py-3 sm:px-7">
          <p className="hidden text-xs text-muted sm:block">预览不会自动保存草稿</p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={publishing}
              onClick={() => onOpenChange(false)}
            >
              返回编辑
            </Button>
            <Button type="button" size="sm" disabled={publishing} onClick={onPublish}>
              {publishing ? <Loader2 className="animate-spin" /> : <Send />}
              {publishing ? "正在提交…" : publishLabel}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
