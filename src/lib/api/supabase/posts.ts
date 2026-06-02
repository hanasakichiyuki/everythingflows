import readingTime from "reading-time";
import type { ContentFormat, Post, PostMeta } from "@/types";
import { getSupabaseAdmin, type PostRow } from "./client";
import { cleanupUnusedImages, deletePostImages, extractImageUrls } from "./storage";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function computeReadingTime(body: string, format: ContentFormat) {
  const text = format === "html" ? stripHtml(body) : body;
  return readingTime(text || " ").text;
}

function rowToPost(row: PostRow): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    date: row.date,
    updated: row.updated ?? undefined,
    tags: row.tags ?? [],
    category: row.category ?? undefined,
    published: row.published,
    readingTime: row.reading_time,
    content: row.body,
    contentFormat: row.content_format,
    locale: row.locale,
  };
}

function rowToMeta(row: PostRow): PostMeta {
  const post = rowToPost(row);
  const { content: _c, ...meta } = post;
  void _c;
  return meta;
}

export async function listAllPosts(locale?: string): Promise<PostMeta[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("date", { ascending: false });

  if (locale) query = query.eq("locale", locale);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PostRow[]).map(rowToMeta);
}

export async function listAllPostsAdmin(locale?: string): Promise<PostMeta[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("posts")
    .select("*")
    .order("updated", { ascending: false });

  if (locale) query = query.eq("locale", locale);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PostRow[]).map(rowToMeta);
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToPost(data as PostRow);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] getPostBySlug error:", error);
    throw error;
  }
  if (!data) {
    console.warn("[Supabase] getPostBySlug: no post found for slug:", slug);
    return null;
  }
  return rowToPost(data as PostRow);
}

export async function getAdjacentPosts(
  slug: string,
  locale?: string
): Promise<{ prev: PostMeta | null; next: PostMeta | null }> {
  const posts = await listAllPosts(locale);
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx + 1 < posts.length ? posts[idx + 1] : null,
    next: idx - 1 >= 0 ? posts[idx - 1] : null,
  };
}

export async function getPostsByTag(tag: string, locale?: string): Promise<PostMeta[]> {
  const posts = await listAllPosts(locale);
  return posts.filter((p) =>
    p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

export async function getArchiveByYear(locale?: string) {
  const posts = await listAllPosts(locale);
  const grouped = new Map<number, PostMeta[]>();

  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year)!.push(post);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, posts: items }));
}

export async function getSearchIndex(locale?: string) {
  const posts = await listAllPosts(locale);
  return posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: p.tags,
    category: p.category,
    date: p.date,
  }));
}

export async function listPostSlugs(locale?: string): Promise<string[]> {
  const posts = await listAllPosts(locale);
  return posts.map((p) => p.slug);
}

export type UpsertPostInput = {
  slug?: string;
  title: string;
  description: string;
  body: string;
  contentFormat: ContentFormat;
  tags: string[];
  category?: string;
  locale: string;
  published?: boolean;
  id?: string;
};

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

async function uniqueSlug(supabase: ReturnType<typeof getSupabaseAdmin>, base: string): Promise<string> {
  let slug = base;
  let counter = 2;

  while (true) {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function deletePost(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch body before deleting, to clean up associated images
  const { data: post } = await supabase
    .from("posts")
    .select("body")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;

  // Clean up images from storage
  if (post) {
    const urls = extractImageUrls((post as PostRow).body ?? "");
    if (urls.length > 0) {
      deletePostImages(urls).catch((e) =>
        console.warn("Image cleanup failed on post delete:", e)
      );
    }
  }
}

export async function deletePosts(ids: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch bodies before deleting, to clean up associated images
  const { data: posts } = await supabase
    .from("posts")
    .select("body")
    .in("id", ids);

  const { error } = await supabase.from("posts").delete().in("id", ids);
  if (error) throw error;

  // Clean up images from storage
  if (posts && posts.length > 0) {
    const allUrls: string[] = [];
    for (const row of posts as PostRow[]) {
      const urls = extractImageUrls(row.body ?? "");
      allUrls.push(...urls);
    }
    if (allUrls.length > 0) {
      deletePostImages(allUrls).catch((e) =>
        console.warn("Image cleanup failed on posts delete:", e)
      );
    }
  }
}

export async function upsertPost(input: UpsertPostInput): Promise<Post> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const contentFormat = input.contentFormat;
  const reading_time = computeReadingTime(input.body, contentFormat);

  let slug: string;
  let published: boolean;

  if (input.id) {
    // For updates, keep existing slug unless explicitly provided
    if (input.slug?.trim()) {
      slug = input.slug.trim();
      // Still need to fetch published status
      const { data: existing } = await supabase
        .from("posts")
        .select("published")
        .eq("id", input.id)
        .maybeSingle();
      published = input.published !== undefined ? input.published : (existing?.published ?? false);
    } else {
      // Fetch both slug and published in one query
      const { data: existing } = await supabase
        .from("posts")
        .select("slug, published")
        .eq("id", input.id)
        .maybeSingle();
      slug = existing?.slug || slugify(input.title);
      published = input.published !== undefined ? input.published : (existing?.published ?? false);
    }
  } else {
    const baseSlug = input.slug?.trim() || slugify(input.title);
    slug = await uniqueSlug(supabase, baseSlug);
    published = input.published !== false;
  }

  const row = {
    slug,
    title: input.title,
    description: input.description,
    body: input.body,
    content_format: contentFormat,
    date: now,
    updated: now,
    tags: input.tags,
    category: input.category ?? null,
    published,
    locale: input.locale,
    reading_time,
  };

  let oldBody = "";

  if (input.id) {
    // Fetch old body before updating, for image cleanup
    const { data: oldPost } = await supabase
      .from("posts")
      .select("body")
      .eq("id", input.id)
      .maybeSingle();
    if (oldPost) oldBody = (oldPost as PostRow).body ?? "";

    const { data, error } = await supabase
      .from("posts")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;

    if (oldBody) {
      cleanupUnusedImages(oldBody, input.body).catch((e) =>
        console.warn("Image cleanup failed:", e)
      );
    }
    return rowToPost(data as PostRow);
  }

  // New post: slug is guaranteed unique by uniqueSlug()
  const { data, error } = await supabase.from("posts").insert(row).select("*").single();
  if (error) throw error;
  return rowToPost(data as PostRow);
}
