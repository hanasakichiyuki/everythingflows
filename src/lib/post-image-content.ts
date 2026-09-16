import type { ContentFormat } from "@/types";
import type { TiptapDocument } from "@/lib/editor/types";
import { extractTiptapImageUrls } from "@/lib/editor/serialization";

/**
 * 文章内容 → 图片 URL 的纯计算工具。
 *
 * 与 `lib/api/media.ts` 的分工：这里只做解析/比对，不接触 AWS SDK，因此可以安全地
 * 出现在公开页面的服务端渲染依赖图里（`lib/api/supabase/posts.ts` 会静态引入它）；
 * R2 的上传与删除等真正需要 S3 客户端的操作留在 media.ts，并由写入路径按需动态加载。
 */

export type StoredPostContent = {
  body: string;
  contentJson?: TiptapDocument | null;
  contentFormat: ContentFormat;
};

export function extractImageUrls(html: string): string[] {
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export function extractPostImageUrls(content: StoredPostContent): string[] {
  if (content.contentFormat === "tiptap" && content.contentJson) {
    return extractTiptapImageUrls(content.contentJson);
  }
  if (content.contentFormat === "html") {
    return extractImageUrls(content.body);
  }
  return [];
}

export function findUnusedPostImageUrls(
  oldContent: StoredPostContent,
  newContent: StoredPostContent
): string[] {
  const oldUrls = extractPostImageUrls(oldContent);
  const newUrls = new Set(extractPostImageUrls(newContent));
  return oldUrls.filter((url) => !newUrls.has(url));
}
