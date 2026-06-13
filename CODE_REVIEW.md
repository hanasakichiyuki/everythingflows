# 万物流转 — 架构与性能审查报告

> 审查日期：2026-06-12 ｜ 技术栈：Next.js 15 (App Router) · React 19 · next-intl · Supabase · Live2D/pixi.js
>
> P0–P2 已全部落地，P3 按需做了「数据层收敛」。本文档已压缩：原始逐条代码级提案见 git 历史，这里只留**现状 + 关键决策/坑 + 有意未做项**，供后续开发接续。

---

## 1. 问题状态总览

| # | 严重度 | 状态 | 问题 | 落地要点 |
|---|--------|------|------|----------|
| P0-1 | 🔴 | ✅ | 全站 `force-dynamic`，无 SSG/ISR | 首页/archive/fragments/blog[slug] 全改 `revalidate=3600`；登录态判断客户端化（`EditPostButton`/`ArchiveView`）以解除 cookie 动态化 |
| P0-2 | 🔴 | ✅ | 每页拉全部正文做搜索索引 | 列表/索引查询只 `select` 精简列（`META_COLUMNS`，不含 `body`），正文只在 `getPostBySlug` 取 |
| P0-3 | 🔴 | ✅ | 详情页缺 metadata、无 sitemap/robots | `blog/[slug]` 加 `generateMetadata`；新增 `sitemap.ts`/`robots.ts`（**无 locale 前缀** URL） |
| P0-4 | 🔴 | ✅ | 正文在 client 注入，爬虫读不到 | `HtmlContent`/`PostContent` 改服务端组件，服务端 sanitize + `dangerouslySetInnerHTML` |
| P1-1 | 🟠 | ✅ⁱ | 字体 `@import` 链 + 97 子集阻塞渲染 | 去 `@import`，改 `layout.tsx` 异步加载字体 CSS（`media=print onload→all` + `<noscript>` 兜底）。ⁱ**子集瘦身有意未做**（见下） |
| P1-2 | 🟠 | ✅ | 头像 1.9MB + 背景图未优化 | `avatar.png`→`avatar.webp`(192px/5.5KB)；`backgroud.jpg`→`background.webp`(~68KB) + `<head>` preload |
| P1-3 | 🟠 | ✅ | 自研 PageTransition 每跳转加 0.4s 遮罩 | 删 `PageTransition`，换轻量 `RouteTransition`（纯 CSS 淡入、不拦链接）；链接全换回原生 `Link` 恢复 prefetch |
| P1-4 | 🟠 | ✅ | 公共读走 service role 绕过 RLS | 新增 `getSupabasePublic()`(anon+RLS)，5 个公共读函数切过去；写/读草稿仍 service role |
| P2-1 | 🟡 | ✅ | 数据 waterfall + 重复全量拉取 | 首页 `Promise.all` 并行；`getAdjacentPosts` 改两条 SQL 边界查询（不再拉全表 `findIndex`） |
| P2-2 | 🟡 | ✅ | framer-motion `opacity:0` 盖首屏内容 | 改纯 CSS 入场动画；**framer-motion 已彻底移除**（见第二轮扫描），全站零 framer-motion |
| P2-3 | 🟡 | ✅ⁱ | 缺 viewport/themeColor、`lang` 硬编码 | 加 `export const viewport`（themeColor+device-width）。ⁱ`<html lang="zh">` 仍硬编码（只有 zh，优先级低） |
| P2-4 | 🟡 | ✅ | 移动端崩溃重载、侧栏遮正文 | Live2D 移动端不 `init()` 引擎 + 贴图 8192→2048；侧栏移动端默认收起 + 抽屉遮罩 |
| P3 | 🟢 | ✅ⁱ | 数据层双重抽象 / 组件按类型划分 | 折叠 provider switch 为单一接缝、删 filesystem 死实现。ⁱ组件目录重组**有意未做**（纯审美、改动大、零收益） |

---

## 2. 关键决策与坑（后续开发务必知晓）

**路由 / ISR**
- `i18n/routing.ts` 用 `localePrefix: "never"`：公开 URL **不带 `/zh`**。所有 canonical/sitemap 按无前缀生成。
- 公共页已 ISR（`revalidate=3600`）。**改数据必须配套 `revalidatePath`**，否则前台不刷新：
  - 文章发/删走 server action（已含 `revalidatePath`）；
  - 碎片增删改在 `api/fragments/route.ts`(POST) 与 `api/fragments/[id]/route.ts`(PATCH/DELETE) 成功后 `revalidatePath("/")` + `revalidatePath("/fragments")`。
- 登录态判断一律**客户端化**（`browser-client` 自查），避免服务端读 cookie 把页面打回 `ƒ Dynamic`。模式见 `EditPostButton`、`components/archive/ArchiveView.tsx`。
- 剩余 `force-dynamic`/动态路由（admin、blog/tag/[tag]、admin/edit/[postId]）均正确保留。

**数据层接缝（换库只改一处）**
- 所有页面/动作经 `lib/api/posts.ts` 访问，不直接 import 具体实现。当前直接委托 `sbPosts.*`。
- 换库：新增同签名实现模块 → 改 `posts.ts` 委托指向 + `provider.ts` 返回值。调用方零改动。
- `api/upload`、`api/posts` 里 `getDataProvider()/isFilesystemMode()` 守卫现恒不触发，是**有意保留的接缝锚点**，勿删。

**权限分层**
- 公共读 = `getSupabasePublic()`（anon key，受 RLS：posts `published=true`、fragments 人人可读）；不读 cookie 以保 ISR-safe。
- 写 / 读草稿 = `getSupabaseAdmin()`（service role，绕 RLS）：`listAllPostsAdmin`/`getPostById`/`upsertPost`/`deletePost(s)`/`uniqueSlug`。
- RLS 策略已在库端齐全（`supabase/schema.sql`、`003_create_fragments.sql`），构建时 anon key 能预渲染 18 个 slug 即为实证。

**排序语义（勿混）**
- `listAllPosts`（前台）按 `date` 降序；`listAllPostsAdmin`（后台）按 `updated` 降序 —— 后台关心刚编辑的浮到前面，已加注释，勿统一。

**CSS 动画 / Tailwind purge（踩过的坑）**
- `.anim-delay-1..5` **必须放在 `@layer` 之外**。class 名在 JSX 以 `` `anim-delay-${index+1}` `` 动态拼接，Tailwind 静态扫描检测不到，置于 `@layer components` 内会被 purge → stagger 失效（首页列表同步入场）。`@layer` 外素 CSS 不参与 purge。
- 静态书写的 `.anim-fade-up`/`.anim-fade-scale`/`.route-fade` 在 `@layer` 内不受影响。
- 所有入场动画均带 `prefers-reduced-motion` 降级。

**Live2D / 移动端**
- 移动端崩溃重载根因：贴图 8192² RGBA 上传 WebGL 约 800MB 显存 → 渲染进程 OOM 被杀 → 浏览器自动重载死循环。
- 修复：`widget.ts` `init()` 检测 `innerWidth<768` 直接 `return`（移动端完全不挂引擎）；贴图 sharp 重采样到 2048（显存约 1/16）；`engine.ts` `MODEL_PATH` 缓存参数 `?v=3` 强刷。

**导航遮罩（智能）**
- `NavigationOverlay.tsx` 用 **capture-phase** 监听点击（Next `<Link>` 在 bubble 阶段 `preventDefault`，故不能查 `defaultPrevented`）；导航 >120ms 才弹吉祥物 → 预取命中的快页面不弹。

---

## 2b. 第二轮扫描修复（2026-06-12，CODE_REVIEW 之外的新发现）

以新鲜视角全量扫描安全/性能/a11y，修复 CODE_REVIEW 未覆盖的问题：

**🔴 安全（已修）**
- **删除 `POST /api/posts` 越权写漏洞**：该 route 未鉴权却走 service role（绕 RLS），中间件 matcher 又排除 `/api`，任何匿名请求可发布/覆盖任意文章。前端发文实际走 server action（已鉴权），此 route 是无人调用的影子接口 → 直接删除。一并删除无用的 `api/comments` stub。README 中过时的「`POST /api/posts` Bearer」说明同步删除。
- **fragments 写接口加白名单校验**：`type∈{image,text}`、`width∈{sm,md,lg}`、`height∈{short,medium,tall}`、`imageUrl` 必须是 `*.supabase.co`（杜绝任意外链写入）、text 类型非空校验。
- **错误信息收敛**：fragments GET/POST/PATCH/DELETE 不再把 Postgres 原始 `error.message` 回传客户端，改通用中文文案 + `console.error` 服务端日志；`publishPost` catch 去掉 `JSON.stringify(e)` 泄露。

**🟠 性能（已修）**
- **彻底移除 framer-motion**：21 个文件（含全站常驻的 MainLayout/Sidebar/NavigationOverlay/ContentCard）仍 import framer-motion，使其进入每条路由的初始 bundle，而用法都是轻量 `whileHover`/淡入/`AnimatePresence`。全部替换为纯 CSS（`anim-*` 体系 + Tailwind hover/active），从 package.json 移除依赖（连带删 3 个包）。退场动画（exit）放弃——对博客 UI 无关紧要。
  - globals.css 新增动画类：`anim-fade-in`/`anim-fade-in-slow`/`anim-fade-left`/`anim-pop-in`/`anim-slide-up`/`anim-bubble-in`/`anim-icon-rotate`，均带 `prefers-reduced-motion` 降级；`anim-delay` 补到 `-6`（Sidebar nav 6 项）。
  - ThemeToggle 用 `key` 变化触发 CSS 重放替代 `AnimatePresence mode=wait`。
  - PostCard、ArchiveTimeline 顺带转为服务端组件（去 `"use client"`）。
- **删除 avatar.png（1.99MB 死资源）**：站点早已用 avatar.webp，零引用。

**🟡 可访问性（顺手做）**
- Toast 加 `role="alert"` + `aria-live` + 关闭按钮 `aria-label`。
- SearchModal / ConfirmDialog / AddFragmentModal / FragmentDetailModal 加 `role="dialog"` `aria-modal`，后两者补 Esc 关闭。
- MemoryCard 图片 alt 从英文占位 `"Memory fragment"` 改为内容 alt（无文字时空 alt，纯装饰）。
- **修正 SearchModal 居中 bug**：`left-[40%]` 笔误（配 `-translate-x-1/2` 导致偏左）→ `left-1/2`。

**验证**：`tsc` 通过；`rm -rf .next && next build` 成功，所有页面预渲染正常，shared First Load JS 降至 103kB（不再含 framer-motion）；grep 构建 CSS 确认 7 个新动画类 + `anim-delay-1..6` 全部输出未被 purge。

**仍未做（评估后保留）**：碎片图片 `<img>`→next/image 懒加载（图片密集页有收益，量中等，单列一批）；MemoryCard 整卡键盘可达（div+onClick）；Modal focus trap；fragments 页 `select("*")`→精简列；Live2D SDK 自托管。

---

## 3. 有意未做项（非遗漏，已评估）

- **字体子集瘦身**（P1-1 核心收益）：需装 Python/fonttools，投入产出不划算；已用异步加载 + `font-display:swap` 缓解阻塞，4.8MB/97 子集仍在。
- **`<html lang>` 动态化**（P2-3 残留）：当前只有 zh，约零收益。
- **组件目录按领域重组**（P3 另一半）：移动几十文件改 import，纯审美、易冲突，对持续开发无实质帮助。

---

## 4. 资产清理备忘

以下旧资源已删除引用但 git 历史可恢复，确认无需后可彻底清理：`huohuo.8192/`（已删）、`avatar.png`、`backgroud.jpg`、`lib/content/posts.ts`（filesystem 死实现，已删）。
