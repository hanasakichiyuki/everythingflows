"use server";

import { revalidatePath, updateTag } from "next/cache";
import { publishPost, deletePost, deletePosts } from "@/lib/api/posts";
import { SEARCH_INDEX_CACHE_TAG } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server-client";
import type { ContentFormat } from "@/types";
import type { TiptapDocument } from "@/lib/editor/types";
import {
  isTiptapDocumentEmpty,
  validateTiptapDocument,
} from "@/lib/editor/types";

export type PublishPostPayload = {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  body: string;
  contentJson?: TiptapDocument | null;
  contentFormat: ContentFormat;
  locale: string;
  published?: boolean;
  slug?: string;
  id?: string;
};

type ValidatedContent =
  | { ok: true; contentJson: TiptapDocument | null }
  | { ok: false; error: string };

function revalidatePublicPostRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/archive");
  revalidatePath("/search");
  revalidatePath("/blog/tag/[tag]", "page");
  revalidatePath("/sitemap.xml");
  updateTag(SEARCH_INDEX_CACHE_TAG);
}

function validatePostPayload(payload: PublishPostPayload): ValidatedContent {
  if (!["html", "mdx", "tiptap"].includes(payload.contentFormat)) {
    return { ok: false, error: "文章内容格式无效" };
  }
  if (!payload.title.trim() || payload.title.length > 200) {
    return { ok: false, error: "标题不能为空且不能超过 200 个字符" };
  }
  if (payload.description.length > 1000) {
    return { ok: false, error: "描述不能超过 1000 个字符" };
  }
  if (payload.category && payload.category.length > 100) {
    return { ok: false, error: "分类不能超过 100 个字符" };
  }
  if (
    payload.tags.length > 20 ||
    payload.tags.some((tag) => !tag.trim() || tag.length > 50)
  ) {
    return { ok: false, error: "标签最多 20 个，且每个不能超过 50 个字符" };
  }

  if (payload.contentFormat === "tiptap") {
    const result = validateTiptapDocument(payload.contentJson);
    if (!result.success) return { ok: false, error: result.error };
    if (isTiptapDocumentEmpty(result.data)) {
      return { ok: false, error: "文章内容不能为空" };
    }
    return { ok: true, contentJson: result.data };
  }

  if (!payload.body.trim() || payload.body.length > 1_000_000) {
    return { ok: false, error: "文章内容不能为空且不能超过 100 万个字符" };
  }
  return { ok: true, contentJson: null };
}

export async function saveDraftAction(payload: PublishPostPayload) {
  // Verify Supabase authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登录" };
  }

  const validated = validatePostPayload(payload);
  if (!validated.ok) {
    return { ok: false as const, error: validated.error };
  }

  // Existing posts preserve their current status. A new draft must be explicit,
  // otherwise the data layer's new-post default is published.
  const result = await publishPost({
    ...payload,
    contentJson: validated.contentJson,
    published: payload.id ? undefined : false,
    id: payload.id,
  });

  if (result.ok) {
    revalidatePublicPostRoutes();
  }

  return result;
}

export async function publishPostAction(payload: PublishPostPayload) {
  // Verify Supabase authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登录" };
  }

  const validated = validatePostPayload(payload);
  if (!validated.ok) {
    return { ok: false as const, error: validated.error };
  }

  const result = await publishPost(
    {
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      category: payload.category,
      body: payload.body,
      contentJson: validated.contentJson,
      contentFormat: payload.contentFormat,
      locale: payload.locale,
      published: payload.published,
      slug: payload.slug,
      id: payload.id,
    }
  );

  if (result.ok) {
    revalidatePublicPostRoutes();
  }

  return result;
}

export async function deletePostAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登录" };
  }

  const result = await deletePost(id);

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePublicPostRoutes();
  }

  return result;
}

export async function deletePostsAction(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登录" };
  }

  const result = await deletePosts(ids);

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePublicPostRoutes();
  }

  return result;
}
