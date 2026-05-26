"use server";

import { revalidatePath } from "next/cache";
import { publishPost, deletePost, deletePosts } from "@/lib/api/posts";
import { createClient } from "@/lib/supabase/server-client";
import type { ContentFormat } from "@/types";

export type PublishPostPayload = {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  body: string;
  contentFormat: ContentFormat;
  locale: string;
  published?: boolean;
  slug?: string;
  id?: string;
};

export async function publishPostAction(payload: PublishPostPayload) {
  // Verify Supabase authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登录" };
  }

  const result = await publishPost(
    {
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      category: payload.category,
      body: payload.body,
      contentFormat: payload.contentFormat,
      locale: payload.locale,
      published: payload.published,
      slug: payload.slug,
      id: payload.id,
    }
  );

  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath(`/blog/${result.post.slug}`);
    revalidatePath("/archive");
    revalidatePath("/search");
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
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath("/archive");
    revalidatePath("/search");
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
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath("/archive");
    revalidatePath("/search");
  }

  return result;
}
