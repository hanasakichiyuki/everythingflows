import { isR2PostImageUrl } from "@/lib/r2-post-image-url";

/**
 * Only render public images uploaded by this site. Keeping this allowlist here
 * prevents the article renderer from emitting arbitrary remote image URLs.
 *
 * Imports the zero-dependency URL helper rather than `lib/api/media` on purpose:
 * this module is pulled into the public article render path (`TiptapContent`), and
 * `lib/api/media` would drag the whole AWS S3 client into that server bundle.
 */
export function isManagedPostImageUrl(value: string): boolean {
  return isR2PostImageUrl(value);
}

/**
 * 历史上这里还有 `getPostImageSource`，把本站图片改写成同源代理
 * `/api/post-image?src=...`。之所以现在**直连**（返回原 URL）而不是继续代理：
 *
 * 代理是流式转发，图片字节必须「浏览器 → 边缘 → 源站 → R2 → 源站 → 边缘 → 浏览器」
 * 走一遍，其中源站那一段受轻量云 6 Mbps 出口带宽限制，且 `/api/*` 在 CDN 上被设为
 * 不缓存（防后台数据串号），所以**每次请求都要回源**。实测同一张 2.1 MB 的图：
 *
 *   经代理   TTFB 0.28–1.04s   总 3.4–13.9s   156–632 KB/s
 *   直连     TTFB 0.15–0.19s   总 0.49–0.55s   ≈ 4 MB/s
 *
 * 当初做代理是因为图片域名还挂在 `r2.dev` 上（官方标注 dev-only，限速限带宽，
 * 国内直连不稳）。现在图片走 `media.*` 独立 EdgeOne 站点，边缘返回
 * `Cache-Control: public, immutable, max-age=31536000` 且 `EO-Cache-Status: HIT`，
 * 直连既快又不占源站带宽，代理的收益已经为负。
 *
 * `/api/post-image` 路由本身保留：既可用于 media 域名故障时应急切回，也让已缓存
 * 的旧 HTML 不至于破图。
 */
