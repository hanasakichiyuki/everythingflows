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
  input: sbPosts.UpsertPostInput,
  adminSecret?: string
): Promise<{ ok: true; post: Post } | { ok: false; error: string }> {
  const { verifyAdminSecret } = await import("@/lib/auth/admin");

  if (getDataProvider() !== "supabase") {
    return { ok: false, error: "DATA_PROVIDER must be supabase to publish" };
  }
  if (!verifyAdminSecret(adminSecret)) {
    return { ok: false, error: "Invalid admin secret" };
  }

  try {
    const post = await sbPosts.upsertPost(input);
    return { ok: true, post };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save post";
    return { ok: false, error: message };
  }
}

export function isSupabaseMode() {
  return getDataProvider() === "supabase";
}
