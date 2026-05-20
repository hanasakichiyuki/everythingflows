"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { publishPostAction } from "@/app/actions/posts";
import { RichTextEditor } from "./RichTextEditor";

type Props = {
  locale: string;
  supabaseMode: boolean;
};

export function PostEditor({ locale, supabaseMode }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

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
      adminSecret: adminSecret || undefined,
    });

    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("ok");
    setMessage(t("published", { slug: result.post.slug }));
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
      <p className="rounded-lg bg-black/5 px-4 py-3 text-sm text-muted dark:bg-white/5">
        {t("hint")}
      </p>

      <label className="block">
        <span className="text-sm font-medium">{t("adminSecretField")}</span>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          placeholder={t("adminSecretPlaceholder")}
          autoComplete="off"
        />
      </label>

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
        {status === "saving" ? t("publishing") : t("publish")}
      </button>
    </div>
  );
}
