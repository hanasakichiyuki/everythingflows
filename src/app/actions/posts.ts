"use server";

import { publishPost, deletePost, deletePosts } from "@/lib/api/posts";
import { revalidatePublicPostRoutes } from "@/lib/revalidate-public-posts";
import { createClient } from "@/lib/supabase/server-client";
import type { TiptapDocument } from "@/lib/editor/types";
import {
  isTiptapDocumentEmpty,
  validateTiptapDocument,
} from "@/lib/editor/types";
import { extractTiptapImageUrls } from "@/lib/editor/serialization";
import { isManagedPostImageUrl } from "@/lib/post-image-proxy";
import { isPostImageHostConfigured } from "@/lib/r2-post-image-url";

export type PublishPostPayload = {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  contentJson?: TiptapDocument | null;
  locale: string;
  published?: boolean;
  slug?: string;
  id?: string;
};

type ValidatedContent =
  | { ok: true; contentJson: TiptapDocument | null }
  | { ok: false; error: string };

/**
 * 正文里的图片是否都来自本站托管。
 *
 * 公开渲染器 `renderImage` 会**丢弃**非本站托管的图片（`isManagedPostImageUrl`），
 * 所以放行这类图片等于"后台看得见、保存成功、发布后消失"。保存阶段直接拦掉，
 * 让作者当场改用"上传图片"重新插入。
 *
 * 覆盖面：`extractTiptapImageUrls` 同时收集 `src` 与原图的 `originalSrc`，两者走同一道
 * 校验。原图会被渲染成可点击的"查看原图"入口（href 是注入面），不能漏检。
 *
 * 未配置图片托管域名时跳过校验：此时渲染器同样无法判定"本站"，判断没有意义。
 */
function findUnmanagedImageError(contentJson: TiptapDocument): string | null {
  if (!isPostImageHostConfigured()) return null;

  const offending = extractTiptapImageUrls(contentJson).find(
    (url) => !isManagedPostImageUrl(url)
  );
  if (!offending) return null;

  let host = offending;
  try {
    host = new URL(offending).host;
  } catch {
    // 地址本身无法解析时直接用原串，便于定位
  }
  return `正文里有非本站托管的图片（${host}），发布后不会显示。请用编辑器的“上传图片”重新插入后再保存。`;
}

function validatePostPayload(payload: PublishPostPayload): ValidatedContent {
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

  // 正文只有结构化内容一种格式：白名单校验 + 非空校验，非法链接协议会在这里被拒绝。
  const result = validateTiptapDocument(payload.contentJson);
  if (!result.success) return { ok: false, error: result.error };
  if (isTiptapDocumentEmpty(result.data)) {
    return { ok: false, error: "文章内容不能为空" };
  }
  const imageError = findUnmanagedImageError(result.data);
  if (imageError) return { ok: false, error: imageError };

  return { ok: true, contentJson: result.data };
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
      contentJson: validated.contentJson,
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
    revalidatePublicPostRoutes();
  }

  return result;
}
