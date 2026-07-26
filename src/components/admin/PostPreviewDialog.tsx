"use client";

import { useMemo } from "react";
import { generateHTML } from "@tiptap/core";
import DOMPurify from "isomorphic-dompurify";
import { Eye, Loader2, Send } from "lucide-react";
import { createEditorExtensions } from "@/lib/editor/extensions";
import {
  isTiptapDocumentEmpty,
  type TiptapDocument,
} from "@/lib/editor/types";
import type { ContentFormat } from "@/types";
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
  contentFormat: ContentFormat;
  contentJson: TiptapDocument;
  legacyBody: string;
  publishing: boolean;
  isEditMode: boolean;
  onPublish: () => void;
};

const previewExtensions = createEditorExtensions();

function getPreviewHtml(
  contentFormat: ContentFormat,
  contentJson: TiptapDocument,
  legacyBody: string
) {
  if (contentFormat === "mdx") return "";

  const source =
    contentFormat === "tiptap" && !isTiptapDocumentEmpty(contentJson)
      ? generateHTML(contentJson, previewExtensions)
      : legacyBody;

  return DOMPurify.sanitize(source, {
    ADD_TAGS: ["aside", "iframe"],
    ADD_ATTR: [
      "target",
      "rel",
      "allow",
      "allowfullscreen",
      "sandbox",
      "loading",
      "referrerpolicy",
      "data-bilibili-embed",
      "data-bvid",
      "data-aid",
      "data-cid",
      "data-page",
      "data-autoplay",
      "data-callout-type",
      "decoding",
    ],
  });
}

export function PostPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  tags,
  category,
  contentFormat,
  contentJson,
  legacyBody,
  publishing,
  isEditMode,
  onPublish,
}: PostPreviewDialogProps) {
  const previewHtml = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : getPreviewHtml(contentFormat, contentJson, legacyBody),
    [contentFormat, contentJson, legacyBody]
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
              {contentFormat === "mdx" ? (
                <div>
                  <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    旧版 MDX 内容会在发布后由服务端渲染；这里展示原始内容，避免预览与正式页面不一致。
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-foreground/[0.045] p-4 font-mono text-xs leading-6 text-foreground/80">
                    {legacyBody}
                  </pre>
                </div>
              ) : (
                <div
                  className="prose-blog"
                  data-rich-content
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
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
