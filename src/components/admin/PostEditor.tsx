"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { publishPostAction } from "@/app/actions/posts";
import { RichTextEditor } from "./RichTextEditor";

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

export function PostEditor({ locale, supabaseMode, initialData }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [tags, setTags] = useState(initialData?.tags.join(", ") ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [content, setContent] = useState(initialData?.body ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const isEditMode = !!initialData;

  const parseTags = () =>
    tags
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const publish = async () => {
    if (!title.trim() || !content.trim()) return;
    setStatus("saving");
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
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("ok");
    setMessage(isEditMode ? t("updated", { slug: result.post.slug }) : t("published", { slug: result.post.slug }));
    router.push(`/blog/${result.post.slug}`);
  };

  if (!supabaseMode) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        {t("filesystemDisabled")}
      </p>
    );
  }

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
          className={`text-sm ${status === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={publish}
        disabled={!title.trim() || !content.trim() || status === "saving"}
        className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {status === "saving" ? (isEditMode ? t("updating") : t("publishing")) : (isEditMode ? t("update") : t("publish"))}
      </button>
    </div>
  );
}
