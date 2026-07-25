"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  FileText,
  ImageIcon,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { MAX_FRAGMENT_TEXT_LENGTH } from "@/lib/fragment-validation";
import type { MemoryFragment } from "@/types/memory";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { Surface } from "@/components/ui/surface";
import { FragmentImage } from "./FragmentImage";

async function copyLink(url: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      // Clipboard 权限不可用时回退到浏览器兼容方案。
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

export function FragmentDetail({ fragment: initialFragment }: { fragment: MemoryFragment }) {
  const t = useTranslations("fragments");
  const [fragment, setFragment] = useState(initialFragment);
  const [canManage, setCanManage] = useState(false);
  const [hasMutated, setHasMutated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialFragment.text ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const checkOwnership = async () => {
      try {
        const response = await fetch(`/api/fragments/${fragment.id}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { canManage?: boolean };
        setCanManage(payload.canManage === true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCanManage(false);
        }
      }
    };
    void checkOwnership();
    return () => controller.abort();
  }, [fragment.id]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const showFeedback = (type: "error" | "success", message: string) => {
    setFeedback({ type, message });
  };

  const handleCopyLink = async () => {
    try {
      await copyLink(window.location.href);
      showFeedback("success", t("copySuccess"));
    } catch {
      showFeedback("error", t("shareError"));
    }
  };

  const handleSave = async () => {
    const nextText = text.trim() || null;
    if (nextText === (fragment.text ?? null)) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/fragments/${fragment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nextText }),
      });
      if (!response.ok) throw new Error("fragment update failed");
      const payload = (await response.json()) as { data?: { text?: string | null } };
      setFragment((current) => ({ ...current, text: payload.data?.text ?? undefined }));
      setText(payload.data?.text ?? "");
      setIsEditing(false);
      setHasMutated(true);
      showFeedback("success", t("saveSuccess"));
    } catch {
      showFeedback("error", t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/fragments/${fragment.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("fragment deletion failed");
      window.location.replace("/fragments");
    } catch {
      showFeedback("error", t("deleteError"));
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const typeLabel = fragment.type === "image" ? t("imageType") : t("textType");

  return (
    <article>
      <Link
        href="/fragments"
        onClick={(event) => {
          if (!hasMutated) return;
          event.preventDefault();
          window.location.assign("/fragments");
        }}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToList")}
      </Link>

      <header className="mt-6 border-b border-border pb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {fragment.type === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              {typeLabel}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("detailTitle")}</h1>
            <time className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted" dateTime={fragment.createdAt}>
              <CalendarDays className="h-4 w-4" />
              {formatDate(fragment.createdAt, "zh-CN")}
            </time>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy className="h-4 w-4" />
            {t("share")}
          </button>
        </div>
      </header>

      <Surface className="mt-8" tone="solid" overlay={false}>
        {fragment.type === "image" ? (
          <div>
            <FragmentImage
              src={fragment.imageUrl}
              alt={fragment.text || t("imageAlt")}
              unavailableLabel={t("imageUnavailable")}
              className="aspect-[4/3] min-h-60 w-full"
              imageClassName="object-contain p-4 sm:p-6"
              loading="eager"
            />
            {(fragment.text || isEditing) && (
              <div className="border-t border-border px-5 py-5 sm:px-7">
                {isEditing ? (
                  <Textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    aria-label={t("imageCaptionField")}
                    maxLength={MAX_FRAGMENT_TEXT_LENGTH}
                    className="min-h-24 border-border bg-background text-foreground focus-visible:ring-ring"
                    rows={4}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted">{fragment.text}</p>
                )}
              </div>
            )}
          </div>
        ) : isEditing ? (
          <div className="p-5 sm:p-7">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label={t("textField")}
              maxLength={MAX_FRAGMENT_TEXT_LENGTH}
              className="min-h-56 border-border bg-background text-foreground focus-visible:ring-ring"
              rows={10}
            />
          </div>
        ) : (
          <div className="p-7 sm:p-10">
            <p className="whitespace-pre-wrap font-serif text-xl leading-[2] tracking-wide text-foreground sm:text-2xl">
              {fragment.text}
            </p>
          </div>
        )}
      </Surface>

      {canManage && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setText(fragment.text ?? "");
                  setIsEditing(false);
                }}
                disabled={saving}
                className="min-h-10 rounded-xl border border-border px-4 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (fragment.type === "text" && !text.trim())}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-destructive/30 px-4 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
              >
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </button>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <p
          className={`mt-5 rounded-xl px-4 py-3 text-sm ${feedback.type === "error" ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t("deleteTitle")}
        message={t("deleteMessage")}
        confirmText={t("confirmDelete")}
        cancelText={t("cancel")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleting}
      />
    </article>
  );
}
