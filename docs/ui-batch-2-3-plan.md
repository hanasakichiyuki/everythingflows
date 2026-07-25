# UI 第 2、3 批收敛计划

> 状态：**待执行**（文档化，尚未落地代码）  
> 日期：2026-07-20  
> 前置：第 1 批可用性修复已完成（播放器避让、对比度、键盘/Dialog 焦点、登录表单 a11y）

## 目标

在保留第 1 批可用性修复的基础上，完成：

1. **第 2 批 · 设计系统收敛** — 语义 token、基础组件、玻璃样式去重  
2. **第 3 批 · 体验抛光** — 搜索入口收敛、全应用 i18n、标题层级、reduced-motion

原则：**视觉迁移以保持现状为默认，先去重再统一 token**，避免一次性重绘造成回归。

## 已确认的产品决策

| 决策点 | 选择 |
|--------|------|
| 搜索入口 | 侧栏 Modal 为主，保留 `/search` 深链，共享同一 `SearchPanel` |
| i18n 深度 | 全应用（用户侧 + Chat + Memory + 后台管理文案） |
| 不改动 | Memory 全宽瀑布流、Chat 全高布局、Live2D、音乐播放器核心交互 |

---

## 1. 建立语义 token 与基础组件

### Token

在 `src/app/globals.css` 与 `tailwind.config.ts` 增加亮/暗主题 token：

- `brand`
- `surface-glass`
- `surface-elevated`
- `ring`
- `destructive`

保留第 1 批已有的 `--mobile-player-height`，勿删除。

### 新建组件

| 组件 | 路径（建议） | 职责 |
|------|--------------|------|
| `GlassCard` | `src/components/ui/GlassCard.tsx` | 统一玻璃表面（含 `legacy` / `surface` / `panel` 等 variant） |
| `Input` | `src/components/ui/input.tsx` | 标准输入，含 `default` / `auth` / `search` / `plain` |
| `Textarea` | `src/components/ui/textarea.tsx` | 标准多行输入 |
| `PageTitle` | `src/components/ui/PageTitle.tsx` | 标准页主标题字号与间距 |

### 扩展现有组件

- `src/components/ui/button.tsx`  
  - 新增 `soft`、destructive 相关 variant  
  - 补充小图标尺寸（如 `icon-sm` / `icon-xs`）  
  - `focus-visible` 统一为 `ring` token  
- `src/components/layout/ContentCard.tsx`  
  - 内部委托 `GlassCard`  
  - **保留**现有负边距、padding 与毛玻璃视觉（`variant="legacy"`）

---

## 2. 迁移重复样式

### 表单 → Input / Textarea

迁移目标：

- Search（Modal + 页面）
- Login
- Memory 弹窗（添加 / 详情编辑）
- Admin 标准字段（`PostEditor` 等）

**暂不迁移（专用控件）：**

- `ChatComposer`（focus-within 容器 + 圆形发送钮）
- 播放器 `range` 滑条
- `RichTextEditor` 工具栏

### 玻璃壳 → GlassCard

迁移目标：

- 首页 Hero（`HomePageContent`）
- `LatestPosts` / `Fragments` / `DateTimeCard`
- `src/app/[locale]/chat/page.tsx` 外层玻璃壳  

**必须保留：** Chat 的动态高度  
`h-[calc(100dvh-8rem-var(--mobile-player-height))]` 与第 1 批安全区逻辑。

### 按钮 → Button

- Memory / Search 模态中适合映射的操作钮迁至统一 `Button`
- **不强行改造**播放器控件与聊天发送/停止按钮

---

## 3. 收敛双入口搜索

1. 抽取共享 `SearchPanel` + 单一 `SearchItem` 类型（建议 `src/types/search.ts`）
2. 统一 Fuse 配置、结果列表、空态与输入样式
3. `SearchModal.tsx`：侧栏主入口，继续使用第 1 批 `Dialog`（焦点陷阱 / Esc / 焦点归还）
4. `SearchBox.tsx` + `/search` 页面：深链兼容，复用同一面板
5. 从 `src/config/site.ts` 的 `navItems` 删除已隐藏的 `/search` 项；**保留** `/search` 路由以兼容书签

---

## 4. 全应用 i18n 与标题层级

### 扩展 `messages/zh.json`

建议新增 / 补齐命名空间：

- `common` — 关闭、确认、取消、加载中、清除等
- `a11y` — 侧栏展开/收起、搜索、播放器等 ARIA
- `layout` — footer、侧栏相关
- `player` — 播放器文案
- `login` — 登录页
- `memory` — 碎片墙与弹窗
- `errors` — 通用错误提示  

并补齐现有 `chat`、`admin` 中尚未接入组件的键。

### 接入方式

- 客户端：`useTranslations`
- 服务端页面：`getTranslations`
- 迁移范围：用户侧、Chat、Memory、后台管理的 UI 文案、占位符、ARIA、确认/错误提示
- **保持内容驱动、不 i18n：** 文章正文、`site.config` 站点名/描述、品牌专名（GitHub 等）

### 标题层级

- 侧栏站点名：`<h1>` → 普通文本（`<p>` / `<span>`）
- 标准内容页：使用 `PageTitle`（统一 `text-2xl font-bold` 等）
- Chat 工具栏标题：改为非页级 heading（`<p>` / `h2`），避免与页面主标题冲突
- **目标：每页仅一个主标题**

---

## 5. reduced-motion 与体验细节

### `globals.css`

扩展 `prefers-reduced-motion: reduce` 覆盖：

- `.animate-slideDown`
- 播放器唱片旋转（含 DesktopPlayer 内联 `spin`）
- `.music-player-btn` 音符 hover
- 全局入场动画（已有部分，补齐遗漏）

### Tailwind / 组件

为以下补 `motion-reduce:` 降级：

- `animate-spin` / `animate-pulse`
- 高频 `scale` / `translate` hover（Sidebar、MemoryCard、PostCard、MainLayout 展开钮等）

加载状态在降级后仍需可理解（例如静态 spinner 或静态骨架）。

### 其他

- 修正文案混用（如首页 `Latest Posts`、`nav.links: "Links"`）
- footer 间距 / 标点
- 标准页面字号统一  

**明确不改：** Memory 全宽瀑布流、Chat 全高布局、Live2D、音乐播放器受保护功能。

---

## 6. 验证清单

### 命令

```bash
npm run lint
npx tsc --noEmit
npm run build
```

### 手测重点

- [ ] 亮 / 暗主题（ContentCard、Memory、Player、Search）
- [ ] ≤767px：主内容 / Chat / FAB / Toast / ChatError 不被播放器遮挡
- [ ] 侧栏 Search Modal 与 `/search` 深链结果一致
- [ ] 登录 / Memory / Admin 表单与 focus 样式
- [ ] Dialog：Tab 环、Escape、关闭后焦点归还
- [ ] 系统「减少动态效果」下无多余动画
- [ ] 每页仅一个可见主标题（侧栏站点名非 h1）

---

## 建议实施顺序

```text
1. Token + GlassCard / Input / Textarea / PageTitle / Button 扩展
2. 表单与玻璃壳迁移（Search → Login → Memory → 首页 → Chat 壳）
3. SearchPanel 抽取与双入口收敛
4. zh.json 扩展 + 全应用文案迁移
5. 标题层级 + reduced-motion
6. lint / tsc / build + 手测
```

建议第 1 批可用性修复先单独 commit，再按上表开第 2/3 批，降低 diff 冲突。

---

## 明确暂不迁移（防回归）

| 区域 | 原因 |
|------|------|
| `Sidebar` 布局壳与 collapse 动画 | 全站 fixed 定位，影响面大 |
| `ConversationList` rename / legacy 下拉玻璃 | 交互密度高，第 1 批已做 a11y |
| `ChatComposer` / `ModelPicker` | 专用交互，非标准表单 |
| 播放器控件与拖拽定位 | 第 1 批已 token 化；按钮与定位耦合 |
| `RichTextEditor` TipTap 工具栏 | 编辑器专用 |
| Live2D bottom 层叠 | protected feature，需单独产品确认 |
| Memory 瀑布流是否套 ContentCard | 刻意全 bleed，本批不改结构 |

---

## 相关文件速查

| 域 | 路径 |
|----|------|
| Token | `src/app/globals.css`, `tailwind.config.ts` |
| 玻璃壳 | `src/components/layout/ContentCard.tsx`, `HomePageContent.tsx`, `chat/page.tsx` |
| 搜索 | `src/components/search/SearchModal.tsx`, `SearchBox.tsx`, `app/[locale]/search/page.tsx` |
| i18n | `messages/zh.json`, `src/i18n/*` |
| 标题 | `src/components/layout/Sidebar.tsx`, 各内容页 |
| Dialog（第 1 批） | `src/components/ui/Dialog.tsx` |
| 审查画布 | Cursor canvases：`ui-review.canvas.tsx` |
