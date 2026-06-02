"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { publishPostAction, saveDraftAction, deletePostAction } from "@/app/actions/posts";
import { RichTextEditor } from "./RichTextEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [content, setContent] = useState(initialData?.body ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditMode = !!initialData;
  const hasChangesRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseTags = () =>
    tags
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const saveDraft = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    setSaveStatus("saving");
    setMessage("");

    const result = await saveDraftAction({
      title: title.trim(),
      description: description.trim(),
      tags: parseTags(),
      category: category.trim() || undefined,
      body: content,
      contentFormat: "html",
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
    // Reset to idle after 2s
    setTimeout(() => {
      setSaveStatus((s) => (s === "saved" ? "idle" : s));
      setMessage("");
    }, 2000);
  }, [title, description, tags, category, content, locale, initialData?.id]);

  const publish = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaveStatus("publishing");
    setMessage("");

    const result = await publishPostAction({
      title: title.trim(),
      description: description.trim(),
      tags: parseTags(),
      category: category.trim() || undefined,
      body: content,
      contentFormat: "html",
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
    hasChangesRef.current = true;
  }, [title, description, tags, category, content]);

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
      case "publishing":
        return "保存中...";
      case "saved":
        return "已保存";
      case "error":
        return "保存失败";
      default:
        return "";
    }
  })();

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm font-medium">{t("titleField")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{t("descField")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{t("tagsField")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{t("categoryField")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </label>

      <div>
        <span className="text-sm font-medium">{t("contentField")}</span>
        <div className="mt-1">
          <RichTextEditor
            onChange={setContent}
            placeholder={t("contentPlaceholder")}
            supabaseMode={supabaseMode}
            initialContent={initialData?.body}
          />
        </div>
        <p className="mt-2 text-xs text-muted">{t("embedHint")}</p>
      </div>

      {message && (
        <p
          className={`text-sm ${saveStatus === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {message}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveDraft}
            disabled={!title.trim() || !content.trim() || saveStatus === "saving" || saveStatus === "publishing"}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/10 disabled:opacity-50"
          >
            保存草稿
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={!title.trim() || !content.trim() || saveStatus === "saving" || saveStatus === "publishing"}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saveStatus === "publishing" ? (isEditMode ? t("updating") : t("publishing")) : (isEditMode ? t("update") : t("publish"))}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {statusLabel && (
            <span className={`text-xs ${saveStatus === "error" ? "text-red-500" : "text-muted"}`}>
              {statusLabel}
            </span>
          )}
          {isEditMode && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded-lg border border-red-500/50 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
            >
              删除文章
            </button>
          )}
        </div>
      </div>

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
