import { revalidatePath } from "next/cache";

/**
 * 碎片（碎碎念）内容变化后失效的公开路由。
 *
 * 之前这里写的是 `revalidatePath("/")` + `revalidatePath("/fragments")`，看起来
 * 天经地义，实际**一条都没生效**：站点所有页面都挂在 `[locale]` 段下，真实 URL 是
 * `/zh/fragments`，而 `/fragments` 这个根级路由并不存在。Next 对不存在的 path
 * 不会报错，只是静默跳过 —— 于是新增碎片后刷新，页面上还是旧内容，要等 ISR 的
 * `revalidate = 3600` 自然过期才更新。
 *
 * 改用 `type: "layout"` 失效根布局下的整棵树（`revalidate-public-posts.ts` 用的
 * 是同一招，所以文章发布后能立刻看到）。ISR 是按访问生成，失效本身不产生开销。
 */
export function revalidatePublicFragmentRoutes() {
  revalidatePath("/", "layout");
  // sitemap 是根级路由，不在 `[locale]` 布局之下，需要单独失效。
  revalidatePath("/sitemap.xml");
}
