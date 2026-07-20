"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Clock3,
  Loader2,
  Save,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { publishPostAction, saveDraftAction, deletePostAction } from "@/app/actions/posts";
import { NovelPostEditor } from "./editor/NovelPostEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocumentEmpty,
  type TiptapDocument,
} from "@/lib/editor/types";
import {
  extractTiptapText,
  htmlToTiptapDocument,
} from "@/lib/editor/serialization";
import type { ContentFormat } from "@/types";

const AUTO_SAVE_INTERVAL = 30_000; // 30s

type Props = {
  locale: string;
  supabaseMode: boolean;
  initialData?: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    category?: string;
    body: string;
    contentJson: TiptapDocument | null;
    contentFormat: ContentFormat;
  };
};

type SaveStatus = "idle" | "saving" | "saved" | "error" | "publishing";

export function PostEditor({ locale, supabaseMode, initialData }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [tags, setTags] = useState(initialData?.tags.join(", ") ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [contentFormat, setContentFormat] = useState<ContentFormat>(
    initialData?.contentFormat ?? "tiptap"
  );
  const [legacyBody, setLegacyBody] = useState(initialData?.body ?? "");
  const [contentJson, setContentJson] = useState<TiptapDocument>(
    initialData?.contentJson ?? EMPTY_TIPTAP_DOCUMENT
  );
  const [editorInitialContent, setEditorInitialContent] =
    useState<TiptapDocument>(
      initialData?.contentJson ?? EMPTY_TIPTAP_DOCUMENT
    );
  const [editorRevision, setEditorRevision] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditMode = !!initialData;
  const hasChangesRef = useRef(false);
  const changeTrackingReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedTags = useMemo(
    () =>
      tags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [tags]
  );

  const hasContent =
    contentFormat === "tiptap"
      ? !isTiptapDocumentEmpty(contentJson)
      : Boolean(legacyBody.trim());
  const contentCharacters = useMemo(
    () =>
      contentFormat === "tiptap"
        ? extractTiptapText(contentJson).replace(/\s/g, "").length
        : legacyBody.replace(/\s/g, "").length,
    [contentFormat, contentJson, legacyBody]
  );

  const saveDraft = useCallback(async () => {
    const contentIsEmpty =
      contentFormat === "tiptap"
        ? isTiptapDocumentEmpty(contentJson)
        : !legacyBody.trim();
    if (!title.trim() || contentIsEmpty) return;
    setSaveStatus("saving");
    setMessage("");

    const result = await saveDraftAction({
      title: title.trim(),
      description: description.trim(),
      tags: parsedTags,
      category: category.trim() || undefined,
      body: contentFormat === "tiptap" ? "" : legacyBody,
      contentJson: contentFormat === "tiptap" ? contentJson : null,
      contentFormat,
      locale,
      id: initialData?.id,
    });

    if (!result.ok) {
      setSaveStatus("error");
      setMessage(result.error);
      return;
    }

    setSaveStatus("saved");
    setMessage("草稿已保存");
    hasChangesRef.current = false;
    if (!initialData?.id && result.post.id) {
      router.replace(`/admin/edit/${result.post.id}`);
      return;
    }
    // Reset to idle after 2s
    setTimeout(() => {
      setSaveStatus((s) => (s === "saved" ? "idle" : s));
      setMessage("");
    }, 2000);
  }, [
    title,
    contentFormat,
    contentJson,
    legacyBody,
    description,
    parsedTags,
    category,
    locale,
    initialData?.id,
    router,
  ]);

  const publish = async () => {
    if (!title.trim() || !hasContent) return;
    setSaveStatus("publishing");
    setMessage("");

    const result = await publishPostAction({
      title: title.trim(),
      description: description.trim(),
      tags: parsedTags,
      category: category.trim() || undefined,
      body: contentFormat === "tiptap" ? "" : legacyBody,
      contentJson: contentFormat === "tiptap" ? contentJson : null,
      contentFormat,
      locale,
      published: true,
      id: initialData?.id,
    });

    if (!result.ok) {
      setSaveStatus("error");
      setMessage(result.error);
      return;
    }

    setSaveStatus("saved");
    setMessage(isEditMode ? t("updated", { slug: result.post.slug }) : t("published", { slug: result.post.slug }));
    router.push(`/blog/${result.post.slug}`);
  };

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveDraft]);

  // Auto-save timer
  useEffect(() => {
    if (!isEditMode) return;
    autoSaveTimerRef.current = setInterval(() => {
      if (hasChangesRef.current) {
        saveDraft();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isEditMode, saveDraft]);

  // Track changes
  useEffect(() => {
    if (!changeTrackingReadyRef.current) {
      changeTrackingReadyRef.current = true;
      return;
    }
    hasChangesRef.current = true;
  }, [
    title,
    description,
    tags,
    category,
    contentFormat,
    contentJson,
    legacyBody,
  ]);

  const convertLegacyHtml = () => {
    try {
      const converted = htmlToTiptapDocument(legacyBody);
      setContentJson(converted);
      setEditorInitialContent(converted);
      setContentFormat("tiptap");
      setEditorRevision((value) => value + 1);
      setSaveStatus("idle");
      setMessage("已转换为新版编辑器，保存后才会写入数据库");
      hasChangesRef.current = true;
    } catch (error) {
      setSaveStatus("error");
      setMessage(error instanceof Error ? error.message : "HTML 转换失败");
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setDeleting(true);
    const result = await deletePostAction(initialData.id);
    setDeleting(false);
    setDeleteConfirmOpen(false);
    if (result.ok) {
      router.push("/admin");
    } else {
      setSaveStatus("error");
      setMessage(result.error);
    }
  };

  const closeEditor = () => {
    if (
      hasChangesRef.current &&
      !window.confirm("当前修改可能尚未保存，确定要关闭编辑器吗？")
    ) {
      return;
    }
    router.push("/");
  };

  if (!supabaseMode) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        {t("filesystemDisabled")}
      </p>
    );
  }

  const statusLabel = (() => {
    switch (saveStatus) {
      case "saving":
        return "正在保存";
      case "publishing":
        return "正在发布";
      case "saved":
        return "已保存";
      case "error":
        return "保存失败";
      default:
        return "";
    }
  })();

  const actionDisabled =
    !title.trim() ||
    !hasContent ||
    saveStatus === "saving" ||
    saveStatus === "publishing";
  const articleIdentifier = initialData?.id
    ? `post-${initialData.id.slice(0, 12)}`
    : "保存后生成文章标识";

  return (
    <div className="grid min-h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-4.5rem)] lg:min-h-0 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-border/60 bg-foreground/[0.018] p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Settings2 className="h-3.5 w-3.5 text-muted" />
          <h2 className="text-xs font-semibold">文章设置</h2>
        </div>

        <div className="space-y-5 py-4">
          <section>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              状态
            </p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-background/45 px-3 py-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span>自动保存</span>
                <span className="flex items-center gap-1.5 text-muted">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isEditMode ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {isEditMode ? "已开启" : "首次保存后"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>内容格式</span>
                <span className="rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted">
                  {contentFormat}
                </span>
              </div>
            </div>
          </section>

          <label className="block">
            <span className="text-[11px] font-medium">{t("descField")}</span>
            <Textarea
              className="mt-1.5 min-h-20 resize-none border-border/70 bg-background/50 px-3 py-2 text-xs leading-5"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="简短描述文章内容"
              maxLength={1000}
              rows={3}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-medium">{t("categoryField")}</span>
            <Input
              className="mt-1.5 h-9 border-border/70 bg-background/50 px-3 py-2 text-xs"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="例如：前端开发"
              maxLength={100}
            />
          </label>

          <section>
            <label className="block">
              <span className="text-[11px] font-medium">{t("tagsField")}</span>
              <Input
                className="mt-1.5 h-9 border-border/70 bg-background/50 px-3 py-2 text-xs"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="使用逗号分隔"
              />
            </label>
            {parsedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parsedTags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-border/60 bg-background/70 px-2 py-1 text-[9px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {isEditMode && (
          <div className="mt-auto border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="h-8 px-2 text-[11px]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除这篇文章
            </Button>
          </div>
        )}
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background/55"
        aria-label="文章编辑区"
      >
        <div className="flex min-h-11 items-center gap-3 border-b border-border/60 px-3 sm:px-4">
          <label
            htmlFor="post-title"
            className="shrink-0 text-[11px] font-medium text-muted"
          >
            文章名称
          </label>
          <Input
            id="post-title"
            className="h-8 min-w-0 flex-1 rounded-lg border-border/60 bg-background/45 px-3 py-1.5 text-xs"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="输入文章标题..."
            maxLength={200}
          />
          <span
            className="hidden max-w-44 truncate font-mono text-[9px] text-muted/60 sm:block"
            title={articleIdentifier}
          >
            {articleIdentifier}
          </span>
        </div>

        {message && (
          <p
            className={`border-b border-border/60 px-4 py-2 text-[11px] ${
              saveStatus === "error"
                ? "bg-red-500/5 text-red-600 dark:text-red-400"
                : "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {message}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {contentFormat === "tiptap" ? (
            <NovelPostEditor
              key={`${initialData?.id ?? "new"}-${editorRevision}`}
              onChange={setContentJson}
              initialContent={editorInitialContent}
            />
          ) : (
            <section className="space-y-3 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs">
                <span>
                  当前文章使用 {contentFormat.toUpperCase()} 格式，将保持原格式保存。
                </span>
                {contentFormat === "html" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={convertLegacyHtml}
                  >
                    转换为新版编辑器
                  </Button>
                )}
              </div>
              <textarea
                value={legacyBody}
                onChange={(event) => setLegacyBody(event.target.value)}
                className="min-h-[calc(100vh-15rem)] w-full border-0 bg-transparent px-4 py-3 font-mono text-sm leading-6 outline-none"
                spellCheck={false}
                aria-label={`${contentFormat.toUpperCase()} 源码`}
              />
            </section>
          )}
        </div>

        <footer className="z-30 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/90 px-3 py-2 backdrop-blur-xl sm:px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
            <span>{contentCharacters} 字</span>
            <span className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {isEditMode ? "每 30 秒自动保存" : "首次保存后开启自动保存"}
            </span>
            <span>⌘S / Ctrl+S 保存草稿</span>
            {statusLabel && (
              <span
                className={`flex items-center gap-1 ${
                  saveStatus === "error" ? "text-red-500" : ""
                }`}
              >
                {(saveStatus === "saving" ||
                  saveStatus === "publishing") && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {statusLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeEditor}
            >
              关闭
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saveDraft}
              disabled={actionDisabled}
              className="gap-1.5 rounded-full"
            >
              <Save className="h-3.5 w-3.5" />
              保存草稿
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={publish}
              disabled={actionDisabled}
              className="gap-1.5 rounded-full"
            >
              <Send className="h-3.5 w-3.5" />
              {saveStatus === "publishing"
                ? isEditMode
                  ? t("updating")
                  : t("publishing")
                : isEditMode
                  ? t("update")
                  : t("publish")}
            </Button>
          </div>
        </footer>
      </section>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除文章"
        message="确定要删除这篇文章吗？此操作不可撤销。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
}
