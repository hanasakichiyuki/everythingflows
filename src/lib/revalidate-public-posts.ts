import { revalidatePath, updateTag } from "next/cache";
import { SEARCH_INDEX_CACHE_TAG } from "@/lib/cache-tags";

/**
 * 文章内容变化后需要失效的全部公开路由。
 *
 * 抽成独立模块（而不是留在 Server Action 文件里）是因为 "use server" 文件只能导出
 * 异步 Server Action；写入类操作（发布、删除、一次性内容迁移）都需要这段逻辑。
 */
export function revalidatePublicPostRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/archive");
  revalidatePath("/search");
  revalidatePath("/blog/tag/[tag]", "page");
  revalidatePath("/sitemap.xml");
  updateTag(SEARCH_INDEX_CACHE_TAG);
}
