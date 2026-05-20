import readingTime from "reading-time";
import type { ContentFormat, Post, PostMeta } from "@/types";
import { getSupabaseAdmin, type PostRow } from "./client";

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

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToPost(data as PostRow);
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

export async function upsertPost(input: UpsertPostInput): Promise<Post> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const slug = input.slug?.trim() || slugify(input.title);
  const contentFormat = input.contentFormat;
  const reading_time = computeReadingTime(input.body, contentFormat);

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
    published: input.published !== false,
    locale: input.locale,
    reading_time,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("posts")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return rowToPost(data as PostRow);
  }

  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("posts")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return rowToPost(data as PostRow);
  }

  const { data, error } = await supabase.from("posts").insert(row).select("*").single();
  if (error) throw error;
  return rowToPost(data as PostRow);
}
