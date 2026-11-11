/**
 * 生成同源代理地址 `/api/post-image?src=...`。
 *
 * **新代码不要再用它。** 图片已改为直连 `R2_PUBLIC_BASE_URL`（`media.*`，EdgeOne
 * 边缘按 immutable 缓存一年）。代理是服务端流式转发，字节要走
 * 「浏览器 → 边缘 → 源站 → R2 → 源站 → 边缘 → 浏览器」，源站那一段只有 6 Mbps
 * 出口带宽，且 `/api/*` 在 CDN 上不缓存，实测比直连慢 6–10 倍。
 *
 * 保留此函数是为了应急：若图片域名或证书出问题，把渲染处的 `src` 换回
 * `getPostImageProxyUrl(src)` 即可立刻恢复出图（代价是变慢），不必改 nginx。
 * `/api/post-image` 路由同样保留，也让已缓存的历史 HTML 不至于破图。
 */
export function getPostImageProxyUrl(source: string): string {
  return `/api/post-image?src=${encodeURIComponent(source)}`;
}
