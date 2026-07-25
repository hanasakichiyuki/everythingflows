import readingTime from "reading-time";
import type { ContentFormat, Post, PostMeta } from "@/types";
import type { TiptapDocument } from "@/lib/editor/types";
import { extractTiptapText } from "@/lib/editor/serialization";
import { getSupabaseAdmin, getSupabasePublic, type PostRow } from "./client";
import {
  cleanupUnusedPostImages,
  deletePostImages,
  extractPostImageUrls,
  type StoredPostContent,
} from "./storage";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function computeReadingTime(
  body: string,
  format: ContentFormat,
  contentJson?: TiptapDocument | null
) {
  const text =
    format === "tiptap" && contentJson
      ? extractTiptapText(contentJson)
      : format === "html"
        ? stripHtml(body)
        : body;
  return readingTime(text || " ").text;
}

function rowToStoredContent(
  row: Pick<PostRow, "body" | "content_json" | "content_format">
): StoredPostContent {
  return {
    body: row.body ?? "",
    contentJson: row.content_json ?? null,
    contentFormat: row.content_format,
  };
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
    contentJson: row.content_json,
    contentFormat: row.content_format,
    locale: row.locale,
  };
}

/** Columns needed to build a PostMeta — excludes the heavy `body` field. */
const META_COLUMNS =
  "id,slug,title,description,date,updated,tags,category,published,reading_time,content_format,locale";

type MetaRow = Omit<PostRow, "body" | "content_json" | "created_at">;

function metaRowToMeta(row: MetaRow): PostMeta {
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
    contentFormat: row.content_format,
    locale: row.locale,
  };
}

export async function listAllPosts(locale?: string): Promise<PostMeta[]> {
  const supabase = getSupabasePublic();
  let query = supabase
    .from("posts")
    .select(META_COLUMNS)
    .eq("published", true)
    .order("date", { ascending: false });

  if (locale) query = query.eq("locale", locale);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(metaRowToMeta);
}

export async function listAllPostsAdmin(locale?: string): Promise<PostMeta[]> {
  const supabase = getSupabaseAdmin();
  // 管理后台按「最近更新」排序（updated），与公共读按「发布日期」（date）有意区分：
  // 管理者关心刚编辑过的文章浮到前面，读者关心发布时间线。
  let query = supabase
    .from("posts")
    .select(META_COLUMNS)
    .order("updated", { ascending: false });
  if (locale) query = query.eq("locale", locale);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(metaRowToMeta);
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
  const supabase = getSupabasePublic();
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
  const supabase = getSupabasePublic();

  // 先取当前文章的 date 作为边界（列表按 date 降序：prev = 更早一篇，next = 更晚一篇）
  const { data: current, error: curErr } = await supabase
    .from("posts")
    .select("date")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (curErr) throw curErr;
  if (!current) return { prev: null, next: null };

  const baseDate = current.date;

  const prevQuery = supabase
    .from("posts")
    .select(META_COLUMNS)
    .eq("published", true)
    .lt("date", baseDate)
    .order("date", { ascending: false })
    .limit(1);
  const nextQuery = supabase
    .from("posts")
    .select(META_COLUMNS)
    .eq("published", true)
    .gt("date", baseDate)
    .order("date", { ascending: true })
    .limit(1);

  // locale 过滤与列表保持一致
  const prevQ = locale ? prevQuery.eq("locale", locale) : prevQuery;
  const nextQ = locale ? nextQuery.eq("locale", locale) : nextQuery;

  const [{ data: prevData, error: prevErr }, { data: nextData, error: nextErr }] =
    await Promise.all([prevQ, nextQ]);
  if (prevErr) throw prevErr;
  if (nextErr) throw nextErr;

  const prevRow = prevData?.[0];
  const nextRow = nextData?.[0];

  return {
    prev: prevRow ? metaRowToMeta(prevRow) : null,
    next: nextRow ? metaRowToMeta(nextRow) : null,
  };
}

export async function getPostsByTag(tag: string, locale?: string): Promise<PostMeta[]> {
  // `@>` array matching is case-sensitive. Preserve the former case-insensitive
  // tag URL behavior without requiring a data migration for existing tags.
  const normalizedTag = tag.toLocaleLowerCase();
  const posts = await listAllPosts(locale);
  return posts.filter((post) =>
    post.tags.some((postTag) => postTag.toLocaleLowerCase() === normalizedTag)
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
  const supabase = getSupabasePublic();
  let query = supabase
    .from("posts")
    .select("slug,title,description,tags,category,date")
    .eq("published", true)
    .order("date", { ascending: false });

  if (locale) query = query.eq("locale", locale);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: p.tags ?? [],
    category: p.category ?? undefined,
    date: p.date,
  }));
}

export async function listPostSlugs(locale?: string): Promise<string[]> {
  const supabase = getSupabasePublic();
  let query = supabase
    .from("posts")
    .select("slug")
    .eq("published", true)
    .order("date", { ascending: false });

  if (locale) query = query.eq("locale", locale);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => p.slug as string);
}

export type UpsertPostInput = {
  slug?: string;
  title: string;
  description: string;
  body: string;
  contentJson?: TiptapDocument | null;
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
    const { data, error } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function deletePost(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch canonical content before deleting, to clean up associated images.
  const { data: post } = await supabase
    .from("posts")
    .select("body,content_json,content_format")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;

  // Clean up images from storage
  if (post) {
    const urls = extractPostImageUrls(
      rowToStoredContent(
        post as Pick<PostRow, "body" | "content_json" | "content_format">
      )
    );
    if (urls.length > 0) {
      deletePostImages(urls).catch((e) =>
        console.warn("Image cleanup failed on post delete:", e)
      );
    }
  }
}

export async function deletePosts(ids: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch canonical content before deleting, to clean up associated images.
  const { data: posts } = await supabase
    .from("posts")
    .select("body,content_json,content_format")
    .in("id", ids);

  const { error } = await supabase.from("posts").delete().in("id", ids);
  if (error) throw error;

  // Clean up images from storage
  if (posts && posts.length > 0) {
    const allUrls: string[] = [];
    for (const row of posts as Pick<
      PostRow,
      "body" | "content_json" | "content_format"
    >[]) {
      const urls = extractPostImageUrls(rowToStoredContent(row));
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
  const reading_time = computeReadingTime(
    input.body,
    contentFormat,
    input.contentJson
  );

  let slug: string;
  let published: boolean;
  let existingContent: StoredPostContent | null = null;

  if (input.id) {
    // Fetch existing post data in one query
    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("slug,published,body,content_json,content_format")
      .eq("id", input.id)
      .maybeSingle();
    if (existingError) throw existingError;
    slug = input.slug?.trim() || existing?.slug || slugify(input.title);
    published = input.published !== undefined ? input.published : (existing?.published ?? false);
    if (existing) {
      existingContent = rowToStoredContent(
        existing as Pick<
          PostRow,
          "body" | "content_json" | "content_format"
        >
      );
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
    body: contentFormat === "tiptap" ? "" : input.body,
    content_json: contentFormat === "tiptap" ? input.contentJson ?? null : null,
    content_format: contentFormat,
    date: now,
    updated: now,
    tags: input.tags,
    category: input.category ?? null,
    published,
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

    if (existingContent) {
      cleanupUnusedPostImages(existingContent, {
        body: row.body,
        contentJson: row.content_json,
        contentFormat,
      }).catch((e) =>
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
