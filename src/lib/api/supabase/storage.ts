import { getSupabaseAdmin } from "./client";
import type { ContentFormat } from "@/types";
import type { TiptapDocument } from "@/lib/editor/types";
import { extractTiptapImageUrls } from "@/lib/editor/serialization";

const BUCKET = "post-images";

export async function uploadPostImage(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const ext = filename.split(".").pop() || "png";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    // URL format: https://xxx.supabase.co/storage/v1/object/public/post-images/xxx.png
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    if (u.pathname.startsWith(prefix)) {
      return u.pathname.slice(prefix.length);
    }
  } catch {
    // ignore malformed URLs
  }
  return null;
}

export function extractImageUrls(html: string): string[] {
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export type StoredPostContent = {
  body: string;
  contentJson?: TiptapDocument | null;
  contentFormat: ContentFormat;
};

export function extractPostImageUrls(content: StoredPostContent): string[] {
  if (content.contentFormat === "tiptap" && content.contentJson) {
    return extractTiptapImageUrls(content.contentJson);
  }
  if (content.contentFormat === "html") {
    return extractImageUrls(content.body);
  }
  return [];
}

export async function deletePostImage(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn(`Failed to delete storage image: ${path}`, error.message);
  }
}

export async function deletePostImages(urls: string[]): Promise<void> {
  const paths = [
    ...new Set(
      urls.map(extractStoragePath).filter((p): p is string => p !== null)
    ),
  ];
  if (paths.length === 0) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn("Failed to delete some storage images", error.message);
  }
}

export async function cleanupUnusedPostImages(
  oldContent: StoredPostContent,
  newContent: StoredPostContent
): Promise<void> {
  const toDelete = findUnusedPostImageUrls(oldContent, newContent);
  if (toDelete.length > 0) {
    await deletePostImages(toDelete);
  }
}

export function findUnusedPostImageUrls(
  oldContent: StoredPostContent,
  newContent: StoredPostContent
): string[] {
  const oldUrls = extractPostImageUrls(oldContent);
  const newUrls = new Set(extractPostImageUrls(newContent));
  return oldUrls.filter((url) => !newUrls.has(url));
}
