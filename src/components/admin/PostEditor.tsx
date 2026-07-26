"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Clock3,
  Eye,
  Loader2,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { publishPostAction, saveDraftAction, deletePostAction } from "@/app/actions/posts";
import { NovelPostEditor } from "./editor/NovelPostEditor";
import { PostPreviewDialog } from "./PostPreviewDialog";
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
  const [postId, setPostId] = useState(initialData?.id);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditMode = Boolean(postId);
  const hasChangesRef = useRef(false);
  const changeTrackingReadyRef = useRef(false);
  const changeVersionRef = useRef(0);
  const saveInFlightRef = useRef(false);
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
    if (saveInFlightRef.current) return;
    const contentIsEmpty =
      contentFormat === "tiptap"
        ? isTiptapDocumentEmpty(contentJson)
        : !legacyBody.trim();
    if (!title.trim() || contentIsEmpty) return;

    const savedChangeVersion = changeVersionRef.current;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setMessage("");

    try {
      const result = await saveDraftAction({
        title: title.trim(),
        description: description.trim(),
        tags: parsedTags,
        category: category.trim() || undefined,
        body: contentFormat === "tiptap" ? "" : legacyBody,
        contentJson: contentFormat === "tiptap" ? contentJson : null,
        contentFormat,
        locale,
        id: postId,
      });

      if (!result.ok) {
        setSaveStatus("error");
        setMessage(result.error);
        return;
      }

      const hasNewChanges = changeVersionRef.current !== savedChangeVersion;
      hasChangesRef.current = hasNewChanges;
      setLastSavedAt(new Date());
      setSaveStatus(hasNewChanges ? "idle" : "saved");
      setMessage(
        hasNewChanges
          ? "保存完成，但保存期间还有新修改；请再次保存以保留它们。"
          : ""
      );

      if (!postId && result.post.id) {
        setPostId(result.post.id);
        if (hasNewChanges) {
          // Keep the newer local edits in place while making refreshes point at
          // the draft that was just created. A router navigation here would
          // remount the editor with the older saved snapshot.
          window.history.replaceState(
            window.history.state,
            "",
            `/admin/edit/${result.post.id}`
          );
        } else {
          router.replace(`/admin/edit/${result.post.id}`);
        }
      }
    } catch {
      setSaveStatus("error");
      setMessage("保存文章失败，请稍后重试");
    } finally {
      saveInFlightRef.current = false;
    }
  }, [
    title,
    contentFormat,
    contentJson,
    legacyBody,
    description,
    parsedTags,
    category,
    locale,
    postId,
    router,
  ]);

  const publish = async () => {
    if (saveInFlightRef.current || !title.trim() || !hasContent) return;
    setSaveStatus("publishing");
    setMessage("");

    try {
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
        id: postId,
      });

      if (!result.ok) {
        setSaveStatus("error");
        setMessage(result.error);
        setPreviewOpen(false);
        return;
      }

      setSaveStatus("saved");
      setMessage(isEditMode ? t("updated", { slug: result.post.slug }) : t("published", { slug: result.post.slug }));
      // Publishing leaves the admin workspace and invalidates public-route data.
      // A document navigation avoids an App Router transition retaining the stale
      // admin segment while those routes are being revalidated.
      hasChangesRef.current = false;
      window.location.assign(`/blog/${encodeURIComponent(result.post.slug)}`);
    } catch {
      setSaveStatus("error");
      setMessage("发布文章失败，请稍后重试");
      setPreviewOpen(false);
    }
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

  // Warn before browser navigation or a tab close while content is unsaved.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // App Router links do not trigger beforeunload, so protect header navigation
  // and logout just like a browser refresh or tab close.
  useEffect(() => {
    const confirmLeaving = () => {
      if (!hasChangesRef.current) return true;
      const confirmed = window.confirm("当前修改可能尚未保存，确定要离开编辑器吗？");
      if (confirmed) hasChangesRef.current = false;
      return confirmed;
    };

    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      ) {
        return;
      }

      if (!confirmLeaving()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleFormSubmit = (event: SubmitEvent) => {
      if (!confirmLeaving()) event.preventDefault();
    };

    document.addEventListener("click", handleLinkClick, true);
    document.addEventListener("submit", handleFormSubmit, true);
    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      document.removeEventListener("submit", handleFormSubmit, true);
    };
  }, []);

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
    changeVersionRef.current += 1;
    setSaveStatus((status) => (status === "saved" ? "idle" : status));
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
    if (!postId) return;
    setDeleting(true);
    try {
      const result = await deletePostAction(postId);
      setDeleteConfirmOpen(false);
      if (result.ok) {
        hasChangesRef.current = false;
        router.push("/admin");
      } else {
        setSaveStatus("error");
        setMessage(result.error);
      }
    } catch {
      setSaveStatus("error");
      setMessage("删除文章失败，请稍后重试");
    } finally {
      setDeleting(false);
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
  const articleIdentifier = postId
    ? `post-${postId.slice(0, 12)}`
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
                      isEditMode ? "bg-primary" : "bg-amber-400"
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

        {postId && (
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
                ? "bg-destructive/10 text-destructive"
                : "bg-primary-soft text-primary"
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
            {lastSavedAt && (
              <span>最近保存于 {lastSavedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
            {statusLabel && (
              <span
                className={`flex items-center gap-1 ${
                  saveStatus === "error" ? "text-destructive" : ""
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
              onClick={() => setPreviewOpen(true)}
              disabled={actionDisabled}
              className="gap-1.5 rounded-full"
            >
              <Eye className="h-3.5 w-3.5" />
              {saveStatus === "publishing"
                ? isEditMode
                  ? t("updating")
                  : t("publishing")
                : isEditMode
                  ? "预览更新"
                  : "预览发布"}
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
      <PostPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        description={description}
        tags={parsedTags}
        category={category}
        contentFormat={contentFormat}
        contentJson={contentJson}
        legacyBody={legacyBody}
        publishing={saveStatus === "publishing"}
        isEditMode={isEditMode}
        onPublish={publish}
      />
    </div>
  );
}
