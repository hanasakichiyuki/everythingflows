import type { TiptapDocument } from "@/lib/editor/types";
import { extractTiptapImageUrls } from "@/lib/editor/serialization";

/**
 * 文章内容 → 图片 URL 的纯计算工具。
 *
 * 与 `lib/api/media.ts` 的分工：这里只做解析/比对，不接触 AWS SDK，因此可以安全地
 * 出现在公开页面的服务端渲染依赖图里；R2 的上传与删除等真正需要 S3 客户端的操作
 * 留在 media.ts，并由写入路径按需动态加载。
 *
 * 正文只有结构化一种格式，图片直接遍历 TipTap 的 image 节点即可。
 */

export type StoredPostContent = {
  contentJson?: TiptapDocument | null;
};

export function extractPostImageUrls(content: StoredPostContent): string[] {
  return content.contentJson ? extractTiptapImageUrls(content.contentJson) : [];
}

export function findUnusedPostImageUrls(
  oldContent: StoredPostContent,
  newContent: StoredPostContent
): string[] {
  const oldUrls = extractPostImageUrls(oldContent);
  const newUrls = new Set(extractPostImageUrls(newContent));
  return oldUrls.filter((url) => !newUrls.has(url));
}
