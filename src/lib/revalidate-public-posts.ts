import { revalidatePath, updateTag } from "next/cache";
import { SEARCH_INDEX_CACHE_TAG } from "@/lib/cache-tags";

/**
 * 文章内容变化后需要失效的全部公开路由。
 *
 * 抽成独立模块（而不是留在 Server Action 文件里）是因为 "use server" 文件只能导出
 * 异步 Server Action；写入类操作（发布、删除、一次性内容迁移）都需要这段逻辑。
 *
 * 注意路径必须带 `[locale]` 段：对外 URL 是 `/blog`，真实路由是 `/[locale]/blog`。
 * 传 `/blog` 这种根级路径 Next 会静默跳过（不报错，也不失效），所以以前发布文章后
 * 首页/列表要等 ISR 的 `revalidate = 3600` 自然过期才更新。
 *
 * Next 16 的 `revalidatePath` 是「路由模式拼标签」匹配，所以两件事缺一不可：
 * 1. 用真实路由模式（含 `[locale]`），它才会拼出页面实际注册的
 *    `_N_T_/[locale]/blog/page` 标签；
 * 2. 动态路径必须传 `type`，否则 Next 只打一条 warning 然后什么都不做。
 *
 * ⚠️ 只能从 Server Action 调用：里面的 `updateTag()` 在 Route Handler 下会抛
 * `E872`。需要在 route handler 里失效时，改用 `revalidateTag(tag, "max")`。
 */
export function revalidatePublicPostRoutes() {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/blog", "page");
  revalidatePath("/[locale]/blog/[slug]", "page");
  revalidatePath("/[locale]/blog/tag/[tag]", "page");
  revalidatePath("/[locale]/archive", "page");
  revalidatePath("/[locale]/search", "page");

  // 兜底：整棵根布局树，覆盖以后新增的、会展示文章列表的页面。
  revalidatePath("/", "layout");

  revalidatePath("/sitemap.xml");
  updateTag(SEARCH_INDEX_CACHE_TAG);
}
