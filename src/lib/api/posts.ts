import * as sbPosts from "@/lib/api/supabase/posts";
import type { Post, PostMeta } from "@/types";

/**
 * 统一文章数据 API —— 所有页面/动作都应经此访问，不要直接 import 具体实现。
 *
 * 当前实现：Supabase。这一层是「数据层接缝」：未来更换数据库时，
 * 只需新增一个同签名的实现模块（如 lib/api/<newdb>/posts.ts），
 * 把下面的委托改指向它即可，调用方无需改动。
 */

export async function listPosts(locale?: string): Promise<PostMeta[]> {
  return sbPosts.listAllPosts(locale);
}

export async function listPostsAdmin(locale?: string): Promise<PostMeta[]> {
  return sbPosts.listAllPostsAdmin(locale);
}

export async function getPost(slug: string): Promise<Post | null> {
  return sbPosts.getPostBySlug(slug);
}

export async function getPostById(id: string): Promise<Post | null> {
  return sbPosts.getPostById(id);
}

export async function getPostsByTag(tag: string, locale?: string): Promise<PostMeta[]> {
  return sbPosts.getPostsByTag(tag, locale);
}

export async function getArchiveByYear(locale?: string) {
  return sbPosts.getArchiveByYear(locale);
}

export async function getSearchIndex(locale?: string) {
  return sbPosts.getSearchIndex(locale);
}

export async function getAdjacentPosts(slug: string, locale?: string) {
  return sbPosts.getAdjacentPosts(slug, locale);
}

export async function listPostSlugs(locale?: string): Promise<string[]> {
  return sbPosts.listPostSlugs(locale);
}

export async function publishPost(
  input: sbPosts.UpsertPostInput
): Promise<{ ok: true; post: Post } | { ok: false; error: string }> {
  try {
    const post = await sbPosts.upsertPost(input);
    return { ok: true, post };
  } catch (e) {
    console.error("publishPost error:", e);
    const message = e instanceof Error ? e.message : "保存文章失败";
    return { ok: false, error: message };
  }
}

export async function deletePost(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
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
  try {
    await sbPosts.deletePosts(ids);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete posts";
    return { ok: false, error: message };
  }
}

/** 当前恒为 supabase 模式。保留此导出以兼容调用方（PostEditor 等）。 */
export function isSupabaseMode() {
  return true;
}
