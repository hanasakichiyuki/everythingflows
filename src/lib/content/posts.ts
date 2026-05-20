import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostMeta } from "@/types";

const CONTENT_DIR = path.join(process.cwd(), "content/blog");

function ensureContentDir() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

function parsePostFile(filePath: string, slug: string): Post | null {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  if (data.published === false) return null;

  const locale = (data.locale as string) ?? "zh";

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? new Date().toISOString(),
    updated: data.updated,
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category,
    published: data.published !== false,
    readingTime: readingTime(content).text,
    content,
    contentFormat: "mdx",
    locale,
  };
}

export function getAllPosts(locale?: string): PostMeta[] {
  ensureContentDir();
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => /\.mdx?$/.test(f));

  const posts = files
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, "");
      const post = parsePostFile(path.join(CONTENT_DIR, file), slug);
      if (!post) return null;
      if (locale && post.locale !== locale) return null;
      const { content: _content, ...meta } = post;
      void _content;
      return meta;
    })
    .filter((p): p is PostMeta => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getPostBySlug(slug: string): Post | null {
  ensureContentDir();
  for (const ext of [".mdx", ".md"]) {
    const filePath = path.join(CONTENT_DIR, `${slug}${ext}`);
    if (fs.existsSync(filePath)) {
      return parsePostFile(filePath, slug);
    }
  }
  return null;
}

export function getPostsByTag(tag: string, locale?: string): PostMeta[] {
  return getAllPosts(locale).filter((p) =>
    p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

export function getAllTags(locale?: string): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const post of getAllPosts(locale)) {
    for (const tag of post.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getArchiveByYear(locale?: string) {
  const posts = getAllPosts(locale);
  const grouped = new Map<number, PostMeta[]>();

  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year)!.push(post);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, posts: items as PostMeta[] }));
}

export function getSearchIndex(locale?: string) {
  return getAllPosts(locale).map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: p.tags,
    category: p.category,
    date: p.date,
  }));
}
