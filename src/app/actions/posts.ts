"use server";

import { revalidatePath } from "next/cache";
import { publishPost } from "@/lib/api/posts";
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
  adminSecret?: string;
};

export async function publishPostAction(payload: PublishPostPayload) {
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
    },
    payload.adminSecret
  );

  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath(`/blog/${result.post.slug}`);
    revalidatePath("/archive");
    revalidatePath("/search");
  }

  return result;
}
