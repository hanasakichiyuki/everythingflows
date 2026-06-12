# 万物流转 — 架构与性能审查报告

> 审查日期：2026-06-12
> 视角：资深前端架构师 + 性能优化专家
> 技术栈：Next.js 15 (App Router) · React 19 · next-intl · Supabase · framer-motion · pixi.js/Live2D · next-mdx-remote

整体工程质量不错（数据层抽象、Live2D 脱离 React 渲染、事件清理都做得很用心）。但在**首屏性能、SEO、渲染策略**上有几个系统性问题会明显拖累 LCP/FCP 和搜索收录。下面按严重程度排序。

---

## 0. 进度记录（Changelog）

> 每次完成优化后更新此处，方便下次接续。状态：✅ 已完成 / 🚧 进行中 / ⬜ 未开始

### 2026-06-12 第一批：P0 全部完成 + UI 组件库引入

**P0-2 ✅ 移除全量正文拉取**（`src/lib/api/supabase/posts.ts`）
- `listAllPosts` / `listAllPostsAdmin` 改为只 `select` 必要列（新增 `META_COLUMNS`，不含 `body`），加 `metaRowToMeta` 映射。
- `getSearchIndex` / `listPostSlugs` 改为直接走精简列查询，不再经 `listAllPosts` 拉全量正文。

**P0-3 ✅ 补齐 SEO**
- `blog/[slug]/page.tsx` 新增 `generateMetadata`（标题/描述/canonical/OG article/Twitter card）。
- 新增 `src/app/sitemap.ts`（遍历 `routing.locales`，**无 locale 前缀** URL，1h revalidate）与 `src/app/robots.ts`。
- ⚠️ 关键点：`i18n/routing.ts` 用 `localePrefix: "never"`，公开 URL **不带** `/zh` 前缀，所有 canonical/sitemap 都按无前缀生成。

**P0-4 ✅ 正文服务端渲染**
- `HtmlContent` 改服务端组件：服务端 `DOMPurify.sanitize` + `dangerouslySetInnerHTML`；外链 target/rel 用 **add→sanitize→removeHook** 模式（避免 hook 在单例上累积）。
- `PostContent` 去掉 `"use client"`，按 `contentFormat` 服务端分发。
- 删除已无引用的 `HtmlContentClient.tsx`。

**P0-1 ✅ ISR（去 force-dynamic）**
- `blog/[slug]/page.tsx` 删除 `force-dynamic`，改 `export const revalidate = 3600`。
- 把服务端 `supabase.auth.getUser()`（读 cookie，会强制动态）移除；`EditPostButton` 改为客户端自检登录态（`getSession` + `onAuthStateChange`）。
- `generateStaticParams` 不再对 supabase 返回 `[]`，正常预渲染 slug。结果：该路由从 `ƒ Dynamic` → `● SSG, 1h`，预渲染 18 个文章页。
- 发布/编辑/删除的 server action 已有 `revalidatePath`，失效链路完整。

**P1-1 ✅（部分）字体 `@import` 链消除**
- 删掉 `globals.css` 里的 `@import url('/fonts/...')`（webpack 构建期解析 public 资源会报错）。
- 改为 `app/layout.tsx` 的 `<head>` 运行时 `<link rel="stylesheet">` 加载字体 CSS。
- ⚠️ 仍待办：字体本身 5MB / 97 子集的**瘦身**（fonttools 精简子集）未做——P1-1 的核心收益还没拿到。

**UI 组件库 ✅ 引入 shadcn/ui + 水墨按钮基建**
- 装 `class-variance-authority` + `@radix-ui/react-slot`；新增 `components.json`（手动接入，未跑 init，未覆盖现有主题）。
- 新增 `src/components/ui/button.tsx`：shadcn 风格 `Button`，variant = `default/outline/secondary/destructive/ghost/link/ink`，支持 `asChild`。
- **水墨 `ink` variant**：素雅墨色描边 + 墨汁晕开 hover + 纯墨色单色 + 文楷 serif，视觉集中在 `globals.css` 的 `.btn-ink`（radial-gradient 伪元素晕染）。
- **HeroUI 式丝滑手感**：回弹缓动 `cubic-bezier(0.34,1.56,0.64,1)` + `active:scale-[0.97]` + hover 浮起/软阴影 + 分通道过渡，全带 `prefers-reduced-motion` 降级。
- 已迁移按钮：登录(ink)、错误页重试(ink)、PostEditor 发布(ink)/草稿/删除、admin 各页登出/草稿箱/返回、批量删除、归档管理/编辑/删除、ConfirmDialog。
- **有意保留未迁移**（精心定制的微交互，套通用 Button 会倒退）：音乐播放器(Desktop/Mobile/PlaylistPanel)、ThemeToggle、SearchModal ✕、BackButton、AddFragmentModal(深色 zinc 主题)、global-error(独立 `<html>` 用内联样式)。

**下次建议接续**：P1-1 字体瘦身 → P1-2 头像/背景图优化 → P1-3 PageTransition → P1-4 公共读改 anon+RLS → P2 系列 → P3 目录重构。也可继续把保留的播放器/ThemeToggle 等统一进 Button 体系。

---

## 1. 问题清单（按严重程度）

| # | 严重度 | 状态 | 问题 | 主要影响 |
|---|--------|------|------|----------|
| P0-1 | 🔴 致命 | ✅ | 全站 `force-dynamic`，无 SSG/ISR，每次请求都打 DB | TTFB / LCP |
| P0-2 | 🔴 致命 | ✅ | `LocaleLayout` 每个页面都拉取**全部文章正文**做搜索索引 | TTFB / 内存 / 带宽 |
| P0-3 | 🔴 致命 | ✅ | 博客详情页缺 `generateMetadata`，无 sitemap/robots | SEO 几乎为零 |
| P0-4 | 🔴 致命 | ✅ | `PostContent` 是 `"use client"` 却渲染 `next-mdx-remote/rsc` | 渲染路径错乱 / 正文不可被爬虫读取 |
| P1-1 | 🟠 高 | 🚧 | LXGW 字体 97 个子集通过 CSS `@import` 链式加载 | FCP / 渲染阻塞 |
| P1-2 | 🟠 高 | ⬜ | `avatar.png` 1.9MB 原图 + `priority` 加载 | LCP / 带宽 |
| P1-3 | 🟠 高 | ⬜ | 自研 `PageTransition` 给每次跳转加 0.4s 动画 + 全屏遮罩 | INP / 感知性能 |
| P1-4 | 🟠 高 | ⬜ | 公共读路径全部走 `SERVICE_ROLE_KEY`（绕过 RLS） | 安全 |
| P2-1 | 🟡 中 | ⬜ | 数据获取串行 waterfall（首页、详情页重复全量拉取） | TTFB |
| P2-2 | 🟡 中 | ⬜ | framer-motion `initial opacity:0` 铺满首屏关键内容 | FCP / 感知 LCP |
| P2-3 | 🟡 中 | ⬜ | `html lang="zh"` 硬编码、根 layout 无 `viewport`/`themeColor` | a11y / 移动端 |
| P2-4 | 🟡 中 | ⬜ | 移动端侧边栏默认展开、遮挡正文、背景图无优化 | 移动端体验 / CLS |
| P3 | 🟢 低 | ⬜ | 目录结构（数据层双重抽象、组件按类型而非领域划分） | 维护性 |

---

## 2. 原因分析 + 3. 修改建议（合并，给代码级方案）

### 🔴 P0-1：全站 `force-dynamic`，放弃了 Next 的全部缓存能力

`page.tsx`（首页）和 `blog/[slug]/page.tsx` 都写了：

```ts
export const dynamic = "force-dynamic";
```

**原因影响**：博客内容更新频率极低（手动发文），但每个访客的每次访问都触发一次完整的 Supabase 查询 + RSC 渲染。LCP 直接绑死在数据库往返上，且无法被 CDN 边缘缓存。

**建议**：改用 ISR + 标签失效。博客是最典型的「构建时/增量静态」场景。

```ts
// blog/[slug]/page.tsx —— 删掉 force-dynamic
export const revalidate = 3600; // 兜底，1 小时

export async function generateStaticParams() {
  const slugs = await listPostSlugs("zh"); // supabase 也应预生成，别返回 []
  return slugs.map((slug) => ({ locale: "zh", slug }));
}
```

发文/改文时在 server action 里精确失效：

```ts
// app/actions/posts.ts publishPost 成功后
import { revalidatePath, revalidateTag } from "next/cache";
revalidatePath(`/zh/blog/${post.slug}`);
revalidatePath("/zh");           // 首页最新文章
revalidateTag("posts-list");
```

数据层加缓存标签：

```ts
// 给 Supabase fetch 包一层 unstable_cache 或在 fetch 上加 next: { tags: ['posts-list'] }
```

> 注意：`blog/[slug]/page.tsx` 里有 `supabase.auth.getUser()`（判断是否显示编辑按钮），这会让页面强制动态化。把「编辑按钮」拆成一个独立的 client 组件，自己在客户端查登录态，正文页就能保持静态。

---

### 🔴 P0-2：每个页面都拉取全部文章正文，只为了搜索框

`LocaleLayout`（包裹**所有**页面）里：

```ts
const searchItems = await getSearchIndex(locale);
```

链路：`getSearchIndex` → `listAllPosts` → `supabase.from("posts").select("*")` —— **`select("*")` 把每篇文章的 `body` 全字段拉出来**，map 成 meta 后把 `content` 丢掉。也就是说，访问「关于」「友链」任何页面，都会在服务端把全站正文读一遍再扔掉，然后把索引序列化进 HTML 给 `SearchModal`。

**影响**：随文章增长，TTFB 线性恶化；HTML 体积变大；DB 读放大。

**建议**：

1. 数据库层只选需要的列：

```ts
export async function getSearchIndex(locale?: string) {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("posts")
    .select("slug,title,description,tags,category,date") // ⛔ 不要 select("*")
    .eq("published", true)
    .order("date", { ascending: false });
  if (locale) q = q.eq("locale", locale);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
```

`listAllPosts`（列表/归档/相邻文章用）同理也不该 `select("*")`，正文只在 `getPostBySlug` 时取。

2. 搜索索引不该在 layout 同步阻塞渲染。改为：搜索打开时再 `fetch('/api/search-index')` 懒加载，或用一个独立的、带长缓存的 route handler 提供。至少把它移出 layout 的关键路径。

---

### 🔴 P0-3：SEO 基本为零

- 没有任何 `generateMetadata` → 所有博客详情页共用根 layout 的标题「万物流转」，**没有文章标题、描述、OG**。
- 没有 `sitemap.ts` / `robots.ts`。
- 正文通过客户端渲染（见 P0-4），爬虫拿不到内容。

**建议**：

```ts
// blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug));
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated,
      tags: post.tags,
    },
    alternates: { canonical: `/zh/blog/${post.slug}` },
  };
}
```

新增 `src/app/sitemap.ts`：

```ts
import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/api/posts";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPosts("zh");
  const base = siteConfig.url;
  return [
    { url: `${base}/zh`, changeFrequency: "daily", priority: 1 },
    ...posts.map((p) => ({
      url: `${base}/zh/blog/${p.slug}`,
      lastModified: p.updated ?? p.date,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
```

新增 `src/app/robots.ts`：

```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/login", "/api"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
```

再补一个 JSON-LD（`Article` schema）注入到详情页，收录质量会进一步提升。

---

### 🔴 P0-4：正文渲染路径错乱——客户端组件里用了 RSC 版 MDX

`PostContent.tsx` 顶部是 `"use client"`，却静态 import 了 `MdxContent`，而 `MdxContent` 用的是：

```ts
import { MDXRemote } from "next-mdx-remote/rsc"; // ← 服务端专用
```

把 RSC 版 `MDXRemote`（async server component）放进 client 边界，语义上是冲突的。当前能跑通，是因为 Supabase 模式下文章都是 `contentFormat: "html"`，走的是 `HtmlContent` 分支——而 `HtmlContent` 又是 `ssr:false` + `useEffect` 里 `innerHTML` 注入：

```ts
// HtmlContent.tsx
ref.current.innerHTML = DOMPurify.sanitize(content);
```

**影响**：
- **正文完全在客户端注入**，首屏 HTML 里没有文章内容 → 爬虫读不到（叠加 P0-3，SEO 雪上加霜）、LCP 元素（正文）延后到 JS 执行后。
- MDX 路径实际是死代码，但保留着会误导维护。

**建议**：正文应在**服务端**渲染。

- HTML 文章：服务端 sanitize 后直接输出，去掉 `ssr:false` 和 `useEffect`：

```ts
// 服务端组件（去掉 "use client"）
import DOMPurify from "isomorphic-dompurify";
export function HtmlContent({ content }: { content: string }) {
  const clean = DOMPurify.sanitize(content, { ADD_ATTR: ["target", "rel"] });
  return <div className="prose-blog" dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

`target="_blank"` 在发布时就写进 HTML（`MdxContent` 已有 external-link 逻辑，搬到生成阶段即可），避免运行时再遍历 DOM。

- MDX 文章：保留 `next-mdx-remote/rsc`，但让 `PostContent` 本身是**服务端组件**，按 `contentFormat` 分支渲染，不要包 `"use client"`。

这样正文进入首屏 HTML，LCP/SEO 双赢。

---

### 🟠 P1-1：LXGW 文楷 97 子集 + CSS `@import` 链

`globals.css` 第一行：

```css
@import url('/fonts/lxgw-wenkai/style.css'); /* 它又 @import lxgwwenkaiscreen.css（106KB，97 个 @font-face）*/
```

**影响**：
- `@import` 是**串行请求链**（globals → style.css → 主 css），且 `@import` 在 CSS 中是渲染阻塞的，拖慢 FCP。
- 97 个 `woff2` 各 ~55KB（总计约 5MB），虽有 `unicode-range` 分片，但中文页面命中面广，会同时拉多个。

**建议**：
1. 去掉 `@import` 链，改用 `next/font/local` 管理，让 Next 注入 `<link rel="preload">` + 自动 `font-display`：

```ts
// app/fonts.ts
import localFont from "next/font/local";
export const lxgw = localFont({
  src: [{ path: "../../public/fonts/lxgw-wenkai/files/...woff2", weight: "400" }],
  display: "swap",
  variable: "--font-lxgw",
  preload: false, // 中文子集太多，别全 preload
});
```
2. 文楷只用在首页那段引文和正文 `serif`。考虑**只对该段落生效**，并接受系统中文字体兜底（tailwind 里已有 `PingFang SC` fallback），首屏不必等文楷。
3. 长期方案：用 `fonttools` 按站点实际用字做**单文件精简子集**，把 5MB 压到几十 KB。

---

### 🟠 P1-2：1.9MB 头像原图 + `priority`

`public/avatar/avatar.png` = **1995611 字节**，在 `Sidebar` 里 `fill + priority + sizes="96px"`。`priority` 会让它进入预加载，和 LCP 抢带宽。

**建议**：
- 头像显示尺寸仅 96px。预先压成 192px 的 webp（约 10–20KB）。`next/image` 虽会优化，但源图过大仍浪费 transform 资源。
- `backgroud.jpg`（167KB）作为全屏 `background-image` 内联在 `MainLayout` 的 inline style，无法被 `next/image` 优化、也不会预加载。考虑用 `<Image fill priority>` 或在 `<head>` 加 `preload`，并提供移动端较小版本。

---

### 🟠 P1-3：自研页面过渡给每次导航强加延迟

`PageTransition` 拦截所有链接：`e.preventDefault()` → `router.push` → 显示全屏 loading 遮罩 → `AnimatePresence mode="wait"` 出场动画 0.4s。

**影响**：
- 每次跳转**至少多 0.4s** 的退出动画 + 遮罩，且 `document.body.style.overflow="hidden"`。这是典型的「为动画牺牲 INP/感知性能」。
- 绕过了 Next `<Link>` 的预取与即时切换。

**建议**：
- 优先用 Next 原生 `loading.tsx`（Suspense streaming）替代手写遮罩，几乎零成本就有骨架/过渡。
- 若一定要保留淡入，把退出动画砍到 ~0.15s 并去掉全屏遮罩；让 `<Link>` 保留 prefetch（别 `preventDefault`）。

---

### 🟠 P1-4：公共读路径使用 Service Role Key

`getSupabaseAdmin()` 用的是 `SUPABASE_SERVICE_ROLE_KEY`，**绕过所有 RLS**，却被用于 `listAllPosts` / `getPostBySlug` 等公共读取。

**影响**：虽然 key 只在服务端，不会泄露给浏览器，但「所有读都用最高权限」放大了任何注入/逻辑漏洞的爆炸半径（比如某个未加 `.eq("published", true)` 的查询就会泄露草稿）。事实上 `listAllPostsAdmin` 就没有 published 过滤，和公共读共用同一个 admin client。

**建议**：
- 公共读用 **anon key + RLS**（`published = true` 策略），写/管理才用 service role。
- 已有 `server-client.ts`（anon key）——公共读改走它，service role 只留给 server actions 和 admin 路由。

---

### 🟡 P2-1：数据获取 waterfall + 重复全量拉取

首页：
```ts
const posts = await listPosts(locale);    // 等待
const fragments = await getFragments();   // 再等待 → 串行
```
详情页：`getPost` → 再 `getAdjacentPosts`（内部又 `listAllPosts` 拉全量）。叠加 layout 的 `getSearchIndex`（又一次全量），**一次详情页访问把全表正文拉了 2–3 遍**。

**建议**：
- 首页并行：`const [posts, fragments] = await Promise.all([listPosts(locale), getFragments()]);`
- `getAdjacentPosts` 用 SQL 直接取前后一条（`order + limit 1 + gt/lt date`），而不是拉全表在内存里 `findIndex`。
- 配合 P0-2，列表查询不取 body。

---

### 🟡 P2-2：framer-motion 把关键首屏内容初始设为不可见

首页大量 `initial={{ opacity: 0, y: 20 }}`，包括 H1 区块、最新文章、日期数字（LCP 候选）。Sidebar 还有 `staggerChildren` 逐项淡入。

**影响**：内容要等 JS hydration + 动画才可见，**人为推迟感知 FCP/LCP**；首屏关键文本不应靠 JS 才出现。

**建议**：
- 首屏「首要内容」（H1、最新文章标题、引文）不要用 `initial opacity:0`。如需入场动画，用纯 CSS `@keyframes`（globals.css 已有 `slideDown`）或 `animate` 不带隐藏的 `initial`。
- 装饰性元素再保留 motion。

---

### 🟡 P2-3：根 layout 元信息缺失 / lang 硬编码

`app/layout.tsx`：`<html lang="zh">` 写死；没有 `viewport` / `themeColor`。`metadataBase` 有了（好）。

**建议**：
```ts
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b1e" },
  ],
  width: "device-width",
  initialScale: 1,
};
```
`lang` 用当前 locale（虽然现在只有 zh，但 i18n 框架在）。

---

### 🟡 P2-4：移动端体验

- `Sidebar` 默认 `collapsed=false`，在移动端是 `fixed w-[200px] z-20`，会**盖住正文**（main 在移动端 `ml-0`）。移动端应默认收起，或转为抽屉 + 遮罩。
- 全屏背景图未做移动端裁剪。
- Live2D 在移动端仍加载 pixi（虽然延迟）：`isDesktop = innerWidth>=768`，但 `Live2DWidget` 在移动端依然 `init()` 整个引擎。移动端建议直接不挂载。

---

## 4. 推荐重构结构（P3：维护性）

当前数据层是**双重抽象**：`lib/api/posts.ts`（provider switch）+ `lib/api/supabase/posts.ts` + `lib/content/posts.ts`。每个函数都重复 `switch(provider)`，且 filesystem 分支实际已废弃（线上是 supabase）。组件按「类型」（blog/layout/ui/mdx…）划分，领域逻辑分散。

建议向**领域分层 + 单一数据源**收敛：

```
src/
├─ app/                      # 路由（保持）
│   ├─ sitemap.ts            # ✅ 新增
│   ├─ robots.ts             # ✅ 新增
│   └─ [locale]/blog/[slug]/
│       └─ loading.tsx       # ✅ 用原生 streaming 替代手写遮罩
│
├─ features/                 # 按领域聚合（组件 + hooks + 类型 + 数据）
│   ├─ posts/
│   │   ├─ components/        PostContent / PostCard / PostNavigation
│   │   ├─ queries.ts         ← 合并 provider，只保留 supabase；只选必要列
│   │   └─ types.ts
│   ├─ fragments/
│   ├─ music/                 useMusicPlayer + DesktopPlayer + MobilePlayer
│   └─ live2d/                engine / widget / Widget(bridge)
│
├─ components/ui/            # 纯展示通用件（Toast/ConfirmDialog/NavIcon）
├─ components/layout/        # 真正的布局壳（Sidebar/MainLayout/RightSidebar）
├─ lib/
│   ├─ supabase/             # client(anon) / admin(service) / server / middleware
│   └─ utils.ts
└─ config/
```

要点：
1. **砍掉 provider switch**：线上只用 supabase，把 `lib/api/posts.ts` 的 switch 折叠成直接调用；filesystem 代码若想保留做本地预览，单独放 `legacy/` 并明确文档化，别混在主路径里增加分支噪音。
2. **查询职责单一**：列表查询不取 `body`；正文查询单独。相邻文章用 SQL 边界查询。
3. **权限分层**：公共读 anon+RLS，写用 service role，物理隔离两个 client 的使用面。
4. **正文回到服务端渲染**（P0-4），`PostContent` 不再是 client。

---

## 5. 优先级落地建议

按投入产出排序：

1. **本周必做**：P0-2（去掉 `select("*")` + 移出 layout）、P0-3（metadata + sitemap + robots）、P0-4（正文服务端渲染）。这三项直接决定 SEO 存亡和 TTFB。
2. **紧接着**：P0-1（ISR + 拆编辑按钮去掉 force-dynamic）、P1-1/P1-2（字体与头像）。这是 LCP/FCP 的大头。
3. **打磨**：P1-3、P2 系列、P3 结构重构。

建议从 **P0-3（SEO：metadata + sitemap + robots）** 或 **P0-2（去除全量正文拉取）** 开始落地——改动小、收益大、风险低。
