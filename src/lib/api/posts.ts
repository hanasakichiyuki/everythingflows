import { getDataProvider } from "./provider";
import * as fsPosts from "@/lib/content/posts";
import * as sbPosts from "@/lib/api/supabase/posts";
import type { Post, PostMeta } from "@/types";

/**
 * Unified posts API — all pages should use this instead of reading files directly.
 */
export async function listPosts(locale?: string): Promise<PostMeta[]> {
  const provider = getDataProvider();

  switch (provider) {
    case "filesystem":
      return fsPosts.getAllPosts(locale);
    case "supabase":
      return sbPosts.listAllPosts(locale);
    case "api":
      throw new Error("API provider not configured. Implement lib/api/rest/posts.ts");
    default:
      return fsPosts.getAllPosts(locale);
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  const provider = getDataProvider();

  switch (provider) {
    case "filesystem":
      return fsPosts.getPostBySlug(slug);
    case "supabase":
      return sbPosts.getPostBySlug(slug);
    case "api":
      throw new Error("API provider not configured");
    default:
      return fsPosts.getPostBySlug(slug);
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  const provider = getDataProvider();

  switch (provider) {
    case "filesystem":
      return null;
    case "supabase":
      return sbPosts.getPostById(id);
    case "api":
      throw new Error("API provider not configured");
    default:
      return null;
  }
}

export async function getPostsByTag(tag: string, locale?: string): Promise<PostMeta[]> {
  const provider = getDataProvider();
  switch (provider) {
    case "filesystem":
      return fsPosts.getPostsByTag(tag, locale);
    case "supabase":
      return sbPosts.getPostsByTag(tag, locale);
    default:
      return fsPosts.getPostsByTag(tag, locale);
  }
}

export async function getArchiveByYear(locale?: string) {
  const provider = getDataProvider();
  switch (provider) {
    case "filesystem":
      return fsPosts.getArchiveByYear(locale);
    case "supabase":
      return sbPosts.getArchiveByYear(locale);
    default:
      return fsPosts.getArchiveByYear(locale);
  }
}

export async function getSearchIndex(locale?: string) {
  const provider = getDataProvider();
  switch (provider) {
    case "filesystem":
      return fsPosts.getSearchIndex(locale);
    case "supabase":
      return sbPosts.getSearchIndex(locale);
    default:
      return fsPosts.getSearchIndex(locale);
  }
}

export async function getAdjacentPosts(slug: string, locale?: string) {
  const provider = getDataProvider();
  switch (provider) {
    case "filesystem":
      return fsPosts.getAdjacentPosts?.(slug, locale) ?? { prev: null, next: null };
    case "supabase":
      return sbPosts.getAdjacentPosts(slug, locale);
    default:
      return { prev: null, next: null };
  }
}

export async function listPostSlugs(locale?: string): Promise<string[]> {
  const provider = getDataProvider();
  switch (provider) {
    case "filesystem":
      return fsPosts.getAllPosts(locale).map((p) => p.slug);
    case "supabase":
      return sbPosts.listPostSlugs(locale);
    default:
      return fsPosts.getAllPosts(locale).map((p) => p.slug);
  }
}

export async function publishPost(
  input: sbPosts.UpsertPostInput
): Promise<{ ok: true; post: Post } | { ok: false; error: string }> {
  if (getDataProvider() !== "supabase") {
    return { ok: false, error: "DATA_PROVIDER must be supabase to publish" };
  }

  try {
    const post = await sbPosts.upsertPost(input);
    return { ok: true, post };
  } catch (e) {
    console.error("publishPost error:", JSON.stringify(e, null, 2));
    let message = "Failed to save post";
    if (e instanceof Error) {
      message = e.message;
    } else if (e && typeof e === "object") {
      const err = e as Record<string, unknown>;
      message = (err.message as string) || (err.error as string) || JSON.stringify(e);
    }
    return { ok: false, error: message };
  }
}

export async function deletePost(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (getDataProvider() !== "supabase") {
    return { ok: false, error: "DATA_PROVIDER must be supabase to delete" };
  }
  try {
    await sbPosts.deletePost(id);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete post";
    return { ok: false, error: message };
  }
}

export async function deletePosts(
  ids: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (getDataProvider() !== "supabase") {
    return { ok: false, error: "DATA_PROVIDER must be supabase to delete" };
  }
  try {
    await sbPosts.deletePosts(ids);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete posts";
    return { ok: false, error: message };
  }
}

export function isSupabaseMode() {
  return getDataProvider() === "supabase";
}
