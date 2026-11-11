import { revalidatePath } from "next/cache";

/**
 * 碎片（碎碎念）内容变化后失效的公开路由。
 *
 * 两个坑叠在一起，之前一直没修干净：
 *
 * 1. 站点所有页面都挂在 `[locale]` 段下（`localePrefix: "never"`，对外是
 *    `/fragments`，真实路由是 `/[locale]/fragments`）。传 `/fragments` 这种根级
 *    路径 Next **不报错、直接跳过** ——「新增碎片后刷新还是旧内容」就是这个原因。
 * 2. 只写 `revalidatePath("/", "layout")` 也不够稳：根布局失效在 standalone +
 *    自托管下并不总能命中 `[locale]` 段下的页面缓存。
 *
 * 所以这里显式列出带 `[locale]` 的路由模式，最后再补一次整棵布局树兜底。
 */
export function revalidatePublicFragmentRoutes() {
  // 首页会渲染最新 6 条碎片，碎碎念列表页渲染全部，详情页单条。
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/fragments", "page");
  revalidatePath("/[locale]/fragments/[id]", "page");

  // 兜底：以后新增的、会展示碎片的页面不必再改这里。
  revalidatePath("/", "layout");

  // sitemap 是根级路由，不在 `[locale]` 布局之下，需要单独失效。
  revalidatePath("/sitemap.xml");
}
