# 万物流转 UI/UX 设计规范与优化路线

> 本文是项目唯一的 UI/UX 设计基线、现状审计和后续优化路线。审查依据综合 Emil Kowalski 的设计工程方法、Apple 的界面与物理动效原则，以及项目内的动画机会发现、改进与审查规范。
>
> 本次结论来自源码静态审计。涉及弹性、速度、材质厚度和触摸手感的判断必须在浏览器与真实设备上复核，不能仅凭代码标记为完成。

## 1. 产品气质与设计原则

### 1.1 目标气质

万物流转是以文章、碎片、音乐和 AI 对话为核心的个人内容空间，不是营销落地页，也不是高密度企业后台。界面应让人感到：

- **安静但不冷淡**：暖中性画布承载内容，避免壁纸、粒子和持续漂浮抢夺注意力。
- **清晰但不僵硬**：冷青蓝负责导航、状态和主要动作，少量玫红只用于情绪性强调。
- **精致但不炫技**：细节通过排版、反馈、空间关系和边界状态累积，不通过大量动画证明存在感。
- **内容优先**：真实文章、碎片和可用功能优先于伪统计、伪状态与装饰模块。

### 1.2 决策原则

| 原则 | 项目解释 | 判断问题 |
| --- | --- | --- |
| Purpose | 每个元素和动效都必须服务阅读、导航、状态或反馈 | 去掉它会损害理解或操作吗？ |
| Agency | 用户能预测、取消、返回并从错误中恢复 | 操作是否可撤回？失败后下一步是否明确？ |
| Familiarity | 相同外观必须有相同语义和行为 | 同类按钮、弹层和关闭入口是否一致？ |
| Simplicity | 先展示常用路径，高级能力再逐层展开 | 是否只是把复杂度藏起来，而非真正减少？ |
| Craft | 排版、对齐、状态、动效和设备适配都可解释 | 每个数值和反馈是否有一致来源？ |
| Delight | 愉悦来自前五项正确，不靠附加彩带 | 高频操作是否被不必要的动画拖慢？ |

### 1.3 工程边界

- 优先使用 Server Components；仅在交互确有需要时使用 `"use client"`。
- UI 读取和写入数据必须经过 `src/lib/api/` seam，不得绕过数据抽象层。
- 不因 UI 改造修改数据库 schema、自动执行迁移或改动 `.env*`。
- TipTap JSON 继续作为新文章的规范内容，不持久化派生 HTML，不静默转换旧 MDX。
- 保留网易云音乐、碎片墙、Giscus、自定义编辑器、归档、i18n 和 AI 聊天。
- 保留 Live2D 引擎与资源供未来桌面项目使用，但网站公共布局默认不挂载。
- 所有稳定的用户可见文案进入 `next-intl`，避免在组件内持续新增硬编码文案。

## 2. 视觉设计系统

### 2.1 颜色语义

当前颜色方向以 `src/app/globals.css` 中的语义变量为基线：

| Token | 亮色角色 | 暗色角色 | 使用规则 |
| --- | --- | --- | --- |
| `--background` | 暖米白画布 | 深蓝灰画布 | 页面最底层，不作为局部卡片色 |
| `--foreground` | 深灰正文 | 近白正文 | 主文本与高优先级图标 |
| `--primary` | 冷青蓝 | 明亮青蓝 | 主动作、导航选中、链接与进度 |
| `--primary-soft` | 青蓝浅底 | 青蓝透明底 | 选中态、轻提示、低强度 hover |
| `--accent` | 克制玫红 | 柔和浅玫红 | 少量情绪强调，不承担大面积导航状态 |
| `--surface` | 暖白半透明表面 | 深灰蓝表面 | 卡片、弹层、浮动 chrome |
| `--muted` | 次级文本 | 次级文本 | 必须保持可读对比度，不用于关键状态 |
| `--destructive` | 危险动作 | 危险动作 | 删除、不可逆警告；不可用 accent 替代 |

规则：

- 新组件只使用语义变量或由其派生的 `color-mix()`，不增加散落的品牌 hex。
- 后台与公共页面共享语义色；后台可提高密度，但不得另建一套粉色交互语言。
- 代码块的固定深色背景属于内容语义，可保留独立色值。
- 状态不能只依赖颜色表达；选中、错误和成功同时使用文本、图标或结构变化。

### 2.2 Surface、材质与深度

- 页面画布、内容卡片、浮动控件和模态层最多形成四级深度，不堆叠多个浅色半透明表面。
- 固定导航、移动播放器、搜索弹层可使用 `backdrop-filter`；普通正文卡片优先稳定实色或高不透明度表面。
- 大表面允许更强 blur 与更深阴影，小 chip 和按钮使用轻阴影，避免所有组件都“浮起来”。
- 模态任务使用遮罩聚焦；并行、非阻塞面板不使用强遮罩。
- 浮动 header 与滚动内容相交时，优先考虑轻微渐变或 blur edge，而非处处添加硬分割线。
- 为以下偏好提供降级：

```css
@media (prefers-reduced-transparency: reduce) {
  /* 提高 surface 不透明度，移除 backdrop blur。 */
}

@media (prefers-contrast: more) {
  /* 使用近实色表面和清晰边框。 */
}
```

### 2.3 圆角、阴影与间距

- `--radius: 1.25rem` 是大 Surface 基线；内部控件使用 `0.5–0.75rem`，避免每层同样圆。
- 阴影只表达层级，不表达可点击性；可点击性还需明确 hover、focus 和按压反馈。
- 页面间距使用 `rem` 与响应式 token，避免字体放大后固定 px 布局失衡。
- 正文阅读宽度保持约 `42–48rem`；集合页可放宽到约 `80rem`，首页可使用约 `93.75rem` 的复合布局。
- 相邻控件的间距必须反映关系：控制项靠近被控制内容，不用额外标签弥补错误映射。

### 2.4 排版

- 正文优先系统 sans-serif；品牌标题和适合阅读的情绪段落可使用现有 serif，但不能牺牲中文回退稳定性。
- 大标题使用更紧 leading 与轻微负 tracking；正文保持接近 `line-height: 1.6–1.75`；小字号标签可增加少量 tracking。
- 建议基线：

```css
.display-title {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}
```

- 不用字号单独建立层级；字号、字重、leading、颜色和间距必须共同工作。
- 页面需在浏览器文字放大至 200% 时仍可操作，关键内容不得被固定高度裁切。
- 数字时间、计数和进度可使用 tabular numerals，避免宽度跳动。

### 2.5 响应式与安全区

- 必测宽度：`320 / 375 / 768 / 1024 / 1440px`。
- `768px` 是当前桌面侧栏、移动导航和播放器切换的共同边界，不允许各组件自行漂移。
- 触控目标不小于 `44 × 44px`；视觉图标可以更小，但命中区域不能缩小。
- 移动播放器、底部导航、浮动新增按钮和正文底部共同使用：
  - `--mobile-player-offset`
  - `--mobile-nav-offset`
  - `env(safe-area-inset-bottom)`
- 固定控件不得遮挡页面最后一项、聊天输入框或 Fragment 操作区。

## 3. 组件与页面规范

### 3.1 全局导航与 Header

- 桌面保留完整左侧栏，不改为纯图标窄栏；导航顺序围绕首页、博客、归档、碎片和 AI 组织。
- 搜索是 Header 的主要全局动作，主题切换为次要动作；管理与外部社交入口降低优先级。
- 当前页面必须通过 `aria-current`、色彩和字重共同标识。
- 高频导航应即时响应，不为每次路由切换播放装饰性位移动画。
- 移动端保留 4–5 个核心入口；“更多”打开抽屉，抽屉关闭后焦点返回触发器。

### 3.2 按钮与可点击元素

- 主要 Button 使用共享 primitive，不在业务组件重复发明按压手感。
- 默认按压反馈：`scale(0.97)`，`transform 100–160ms var(--ease-out)`；disabled 状态不得缩放。
- 高频、小尺寸或图标按钮反馈应更克制，不使用弹跳。
- hover 位移和缩放只在精细指针设备启用：

```css
@media (hover: hover) and (pointer: fine) {
  /* hover transform rules */
}
```

- 删除等不可逆动作继续使用确认 Dialog；不把所有普通操作变成确认流程。

### 3.3 Dialog、Popover、Toast

- 居中 Dialog 从视口中心出现，保持中心 transform origin；进入可使用 `scale(0.96) + opacity`，退出沿同一路径且更快。
- Popover、ModelPicker 和锚定面板从触发器方向出现，transform origin 必须与触发器一致。
- Overlay 与 Content 不应依赖会在快速切换时从零重启的通用 keyframe；动态 UI 优先可中断 transition。
- Toast 进入和退出来自同一边缘，连续出现时能够从当前状态重定向；错误使用 assertive，普通成功使用 polite。
- 关闭按钮具备可见 focus、明确 label 和至少 44px 触控区域。

### 3.4 搜索

- 搜索索引只在用户打开搜索后按需加载；继续提供 loading、失败重试、无结果建议和键盘导航。
- 键盘触发搜索属于高频路径：打开、上下选择和 Enter 跳转不增加装饰动画。
- 搜索结果高亮不改变布局，不因选中项造成列表跳动。
- 搜索 Dialog 的视觉材质可保留，但需支持减少透明度与增加对比度。

### 3.5 卡片、文章、归档与碎片

- 首页仅 Featured 内容拥有更强层级，普通文章使用更轻、可扫描的列表或卡片。
- 卡片 hover 位移最多 `2px`，并仅在精细指针启用；触屏依赖按压与 focus，不保留粘滞 hover。
- 文章正文约 `42–48rem`，代码、图片和 Bilibili 可在正文范围内安全溢出但不得造成页面横向滚动。
- 归档强调年、月、日的结构关系，不通过改变 padding、宽高等布局属性制造 hover 动效。
- 碎片图像统一 loading、失败占位与裁切规则；详情必须可深链接、复制链接并保持返回位置可理解。
- Fragment 瀑布流入场仅用于首次、低频展示，不在筛选或频繁返回时反复长时间 stagger。

### 3.6 聊天

- 明确显示匿名限制、当前模型、登录后的能力变化、限流与可恢复错误。
- 流式输出期间必须支持停止；发送、停止和重试按钮状态不可只靠颜色区分。
- 新消息是高频信息流，不为每条消息使用明显位移动画；必要时只保留短淡入以防突然出现。
- 历史面板和 ModelPicker 保持空间来源、Escape 关闭、焦点返回与 reduced-motion 降级。
- 代码复制、消息发送等高频动作提供即时按压/状态反馈，不增加延迟。

### 3.7 音乐

- 首页、桌面浮动播放器和移动播放器共享同一播放状态，不建立第二套状态源。
- 覆盖歌单加载、播放器准备、切歌、空歌单、外部服务失败和重试。
- 播放进度更新必须稳定；不要对 `width` 做持续 transition，应使用 `transform: scaleX()` 或即时更新以避免追赶感。
- 旋转封面属于持续装饰，只在正在播放且用户未启用 reduced motion 时出现。
- 移动播放器与底部导航共享 safe area，不遮挡聊天输入与正文结尾。

### 3.8 后台与编辑器

- 后台可提高信息密度，但继续使用公共语义色、Button、Badge、Dialog、EmptyState、ErrorState 和 Toast。
- 表格/时间线强调扫描效率：稳定列宽、清晰状态、批量操作反馈，不用 padding 与 width 动画让行内容移动。
- 编辑器保存状态、未保存修改、离开提醒、上传失败和发布预览必须持续可见且可恢复。
- 图片上传失败保留已成功项，只重试失败项；不得用全屏阻塞反馈代替局部状态。
- 危险动作使用 destructive 语义，不使用硬编码 pink 作为后台交互主色。

### 3.9 异步与外部服务

每个异步区域按适用范围覆盖以下状态：

| State | 必须回答 |
| --- | --- |
| Loading | 正在发生什么？布局是否保持稳定？ |
| Empty | 为什么为空？用户能做什么？ |
| Error | 失败原因能否说明？是否可以重试或降级？ |
| Success | 操作是否完成？结果在哪里？ |
| Recovery | 刷新、重试或返回后是否保留用户工作？ |

音乐、R2 图片、Giscus、Supabase 与 AI 提供商均视为可能失败的外部依赖；失败时不得留下空白区域、永久 skeleton 或不可操作控件。

## 4. 动效设计系统

### 4.1 是否应该动

| 频率 | 决策 |
| --- | --- |
| 100+ 次/天：键盘搜索、核心导航、频繁快捷操作 | 不做装饰动画 |
| 数十次/天：列表 hover、播放器控制、消息操作 | 删除或缩到近乎不可察觉 |
| 偶发：Dialog、抽屉、Toast、错误恢复 | 允许标准 UI 动效 |
| 稀有：首次空状态、重要完成反馈 | 可使用有限 delight budget |

每个动效必须明确属于：反馈、空间一致性、状态指示、防止突变或解释。仅仅“好看”不是理由。

### 4.2 建议共享 token

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --duration-press: 140ms;
  --duration-popover: 180ms;
  --duration-ui: 220ms;
  --duration-drawer: 280ms;
}
```

- 进入/退出：`var(--ease-out)`。
- 屏幕内移动/形变：`var(--ease-in-out)`。
- hover 颜色：`ease`。
- 持续运动：`linear`。
- 普通 UI 动效控制在 `300ms` 内；Drawer/Modal 可在 `200–500ms`，但必须通过 feel-check。
- 不使用 `ease-in` 作为 UI 进入反馈。

### 4.3 性能与可中断性

- 优先动画 `transform` 与 `opacity`；避免动画 `width`、`height`、padding、margin、top 和 left。
- 快速反复触发的 UI 使用可重定向 transition；预定且不交互的装饰可使用 CSS keyframe。
- Gesture 使用 spring，从当前屏幕值开始并继承释放速度；不得在动画期间锁住输入。
- 拖拽使用 Pointer Events、pointer capture、约 `10px` 意图阈值、多指保护和边界阻尼。
- 动量交互可从 `{ type: "spring", duration: 0.5, bounce: 0.2 }` 起步；非动量 UI 默认无 bounce。

### 4.4 减少动效

减少动效不是删除所有反馈：

```css
@media (prefers-reduced-motion: reduce) {
  /* 删除位移、缩放、旋转与弹性。 */
  /* 保留约 150–200ms 的 opacity、color 或 border 反馈。 */
}
```

- route、列表和 Drawer 不移动，可短淡入或即时显示。
- 按钮保留颜色/边框反馈，取消 scale。
- 播放封面停止旋转；spinner 可改为非位移状态提示或低强度 opacity。
- reduced-motion 下功能与信息顺序必须与默认模式完全一致。

## 5. 当前源码审计

以下为已由源码确认的问题；视觉手感仍需浏览器和真机复核。

| Priority | Location | Before | After | Why | Verification |
| --- | --- | --- | --- | --- | --- |
| P0 | `src/app/globals.css:375,384`；ChatComposer、MobilePlayer、AddFragmentModal 等 | 多处 `transition-all` | 逐项声明 `transform 140ms var(--ease-out)`、`color/background-color 180–220ms ease` 等实际属性 | `all` 会意外动画布局或其他非 GPU 属性，难以保持一致 | `rg "transition-all" src` 应归零或仅剩有明确注释的例外 |
| P0 | `src/app/globals.css:427–538` | 多套手写 cubic-bezier、duration 与 80–480ms stagger | 增加共享 easing/duration token；stagger 改为每项 `30–80ms`，总等待不阻塞交互 | 当前词汇分散且最长延迟让列表显慢 | 检查 token 引用；10% 慢放确认节奏一致 |
| P0 | `src/components/layout/Sidebar.tsx:66–171`、`RouteTransition.tsx` | 高频导航及 route 内容反复播放入场动画 | 高频与键盘路径即时响应；仅保留能防止突变的短 opacity | 日常操作频率高，重复位移动画降低响应感 | 连续切换 10 次路由，无等待、无内容滑入 |
| P0 | PostCard、MemoryCard、Fragments、DesktopPlayer 等 | ungated `hover:-translate-*`、`hover:scale-*`、`group-hover:*` | 变换 hover 放入 `(hover: hover) and (pointer: fine)`；触屏只保留按压/焦点反馈 | 触屏会产生粘滞 hover，且装饰位移不应影响高频浏览 | Chrome touch emulation 与真机点击后无残留 hover |
| P0 | `MobilePlayer.tsx:111`、`DesktopPlayer.tsx:161` | `transition-[width] duration-200` 跟随播放进度 | 使用 `scaleX()` + `transform-origin:left`，或直接更新进度而不 tween | 持续 width 动画触发布局且造成进度追赶 | Performance 面板无持续 layout；进度紧跟音频 |
| P0 | `AdminArchiveTimeline.tsx:138–191` | `transition-all` 同时改变点的宽高与标题 padding | 保持行几何稳定，只动画颜色、opacity 或 transform | hover 造成布局重排和文字位移，降低表格扫描稳定性 | 快速扫过多行时无文字横跳与 layout shift |
| P0 | `globals.css:61–72` | reduced motion 将全局 animation/transition 近乎全部清零 | 移除位置和弹性，保留短 opacity/color/border 状态反馈 | 无障碍模式仍需要理解状态变化 | 模拟 reduce，状态仍清晰且无位移动画 |
| P1 | `ModelPicker.tsx:66`、`ConversationList.tsx:204`、DesktopPlayer 面板 | 锚定面板统一纯淡入或固定方向入场 | 从触发器方向以 `opacity + scale(0.97)` 进入，`180ms var(--ease-out)`，设置对应 origin | 空间来源不清；Popover 应与触发器建立关系 | 10% 慢放确认缩放原点位于触发器 |
| P1 | `src/components/ui/dialog.tsx:19,53` | Overlay 与 Content 使用相同通用 fade keyframe | Modal 居中使用 `opacity + scale(0.96)`；退出同路径、更快；保持中心 origin | Modal 是中心任务，纯淡入缺少材质感，但不能从触发器缩放 | 快速开关不闪跳，Escape 后焦点恢复 |
| P1 | `src/components/ui/Toast.tsx:17–42` | 条件卸载 + `anim-fade-up`，只有进入没有可观察退出 | 使用可中断 transition/存在状态；同一边缘进入退出，进入约 `220ms`、退出约 `160ms` | 动态 Toast 的 keyframe 无法平滑反转，消失突兀 | 连续触发和手动关闭均从当前状态继续 |
| P1 | Button 与散落图标按钮 | Button primitive 为 `scale(0.97)`，业务按钮混用 `scale(0.95)` 或无 active | 统一常规按压为 `scale(0.97)`、`100–160ms var(--ease-out)`；特殊值需说明 | 一致的按压反馈是产品触感基础 | 对比常用按钮，按压幅度与节奏一致 |
| P1 | `MainLayout.tsx:163`、后台 EditorMenus/Archive | 公共背景和交互状态混有 `#f1f2f5`、`#101114`、`pink-*` | 映射到 `background/surface/primary/accent/destructive` 语义 token | 后台局部形成第二套视觉语言，明暗主题难统一 | 搜索硬编码品牌色并完成人工对比度检查 |
| P1 | `globals.css:418–538` 与多个首页/列表组件 | 大量区块首次渲染统一 `fade-up` | 首屏只在低频、能说明层级的组保留短入场；普通内容直接可见 | 所有内容都动会稀释重点并影响感知速度 | 禁用动画与启用动画的 LCP/INP 不出现可感知回退 |
| P1 | 全局 Surface、搜索、移动 chrome | 透明材质有 reduced-motion，但无 reduced-transparency/contrast 方案 | 增加透明度与对比度媒体查询的设计与实现规范 | blur 在部分用户和复杂背景上会降低可读性 | 模拟对应媒体特性，文本与边界保持清晰 |

### 5.1 审计结论

当前 UI 已具备明确品牌方向、语义颜色、状态组件和移动安全区基础，不需要重做视觉。最高杠杆是先统一动效 token 并清除 `transition-all`、布局属性动画与高频重复入场；在这些基础问题完成前，不应新增复杂 spring 或装饰性动效。

## 6. 值得增加的动效机会

所有机会均通过频率、目的、速度和功能性筛选，最多实施以下六项。

| # | Location | Today | Purpose | Frequency | Suggested motion |
| --- | --- | --- | --- | --- | --- |
| 1 | Toast | 进入后直接卸载消失 | 防止突变、空间一致性 | 偶发 | 自底部 `translateY(100%) + opacity:0` 进入，`220ms var(--ease-out)`；同边缘 `160ms var(--ease-out)` 退出；reduce 仅 `opacity 160ms` |
| 2 | ModelPicker / 锚定面板 | 与触发器无空间联系的纯淡入 | 空间一致性 | 偶发 | `scale(0.97) + opacity:0` 到稳定态，`180ms var(--ease-out)`，origin 指向触发器 |
| 3 | 移动导航抽屉 | 固定 transition，缺少物理边界定义 | 空间一致性、状态指示 | 偶发 | 进入/退出 `280ms var(--ease-drawer)`；若未来支持拖拽，再用无 bounce spring 并继承释放速度；reduce 改短淡入 |
| 4 | Dialog Content | 中心内容纯淡入 | 防止突变、材质建立 | 偶发 | `scale(0.96) + opacity:0`，进入 `220ms var(--ease-out)`、退出 `160ms`；Modal 保持中心 origin |
| 5 | 重要保存/发布成功状态 | 依赖文案或 Toast，局部状态切换可能突变 | 状态指示 | 稀有 | 图标/文案 `opacity` 交叉淡化 `180ms ease`，必要时加 `blur(2px)`；不使用 bounce |
| 6 | Fragment 首次空状态 | 静态但属于低频、情绪性时刻 | Delight | 稀有 | 仅空状态图标 `scale(0.96) + opacity:0`，`240ms var(--ease-out)`；不循环、不阻塞操作 |

### 6.1 明确拒绝的候选

- **键盘搜索打开、上下选择和 Enter 跳转**：高频且键盘发起，动画会制造延迟。
- **每条聊天消息明显滑入或弹入**：高频信息流，文字正在被阅读，装饰运动妨碍功能。
- **所有路由统一 slide/fade**：核心导航高频，Next 跳转应优先即时；只在真实内容突变时保留极短 opacity。
- **音乐进度条 spring**：功能性数据需要准确跟手，弹性与追赶会误表达当前时间。
- **文章正文滚动 reveal**：阅读内容不应等动画出现，也不应让用户反复看到装饰性入场。

## 7. 实施路线

### P0 — 先修正确性与一致性

1. 在全局样式建立共享 easing/duration token，并为 Tailwind 任意值提供统一引用方式。
2. 清理 `transition-all`，按组件明确 transform、opacity、color、background、border 和 shadow。
3. 把所有 hover transform 放入精细指针媒体查询；触屏保留 focus/active。
4. 将 reduced-motion 从“清零一切”改为“移除运动、保留短状态反馈”。
5. 把播放器进度与后台时间线从 width/padding/height 动画迁移到 transform/opacity 或即时状态。

边界：不改变 DOM 信息架构、不引入 Motion 依赖、不修改业务状态和 API。

验证：

- `rg "transition-all|transition-\\[width\\]" src`
- DevTools Performance 检查播放器进度和后台 hover 无持续 layout。
- 模拟 touch、reduced motion，确认无粘滞 hover且状态仍可理解。

### P1 — 收敛组件 craft

1. 统一 Button 与图标按钮按压反馈。
2. 区分居中 Modal 与锚定 Popover 的 transform origin 和进入路径。
3. 为 Toast 增加可中断、同路径进入退出。
4. 收敛后台硬编码粉色/背景色到语义 token。
5. 增加 reduced-transparency 与 prefers-contrast 设计降级。
6. 重新评估首屏和列表动画，仅保留低频且有目的的 stagger。

边界：不扩张组件库，不为纯视觉优化改数据库或数据 seam。

验证：

- DevTools Animations 以 10% 速度检查 origin、进入/退出同步与中断。
- 连续打开/关闭 Dialog、Popover、Toast，确认不会从初始帧跳回。
- 检查亮暗主题和后台/公共页面之间的颜色一致性。

### P2 — 真实设备验证后的物理交互

仅当抽屉或面板确实需要拖拽时再实施：

- Pointer capture 与约 `10px` 手势意图阈值。
- 根据当前屏幕值开始动画，传递释放速度。
- 速度投影决定落点，边界使用渐进阻力而非硬停止。
- 默认临界阻尼、无 bounce；只有 flick 等带动量操作允许轻微 `bounce: 0.1–0.2`。
- 多指保护、取消手势、旋转和 safe area 全部纳入真机验证。

边界：P2 不因“更像 Apple”自动成立；没有清晰用户收益就不实现。

## 8. 验收标准

### 8.1 视觉与响应式

- 在 `320 / 375 / 768 / 1024 / 1440px` 下无横向滚动、遮挡或断点冲突。
- 亮色/暗色下正文、muted、边框、primary、accent 和 destructive 具备足够对比度。
- 无文章、无碎片、长标题、无封面、音乐失败、AI 失败时布局仍完整。
- 200% 文字缩放后导航、Dialog、聊天输入和后台操作仍可访问。

### 8.2 输入与无障碍

- 键盘可访问导航、搜索、主题、Dialog、播放器、文章与后台操作。
- Modal/Drawer 正确锁定或隔离背景，Escape 关闭并将焦点还给触发器。
- 触控目标不小于 44px；触屏点击后无粘滞 hover。
- reduced motion 下无位移、缩放、旋转或弹性依赖，但状态反馈仍清楚。
- reduced transparency 和 increased contrast 下浮动 surface 可读。

### 8.3 动效 feel-check

- Chrome DevTools Animations 设为 10% 速度，检查 easing 是否立即响应、是否突然停止。
- Popover 从触发器 origin 出现；Modal 保持中心；进入与退出沿相同路径。
- 快速反复触发不会重启到初始帧或锁住输入。
- 动画只改变 transform/opacity；例外必须有性能测量和注释。
- iOS/Android 真机检查 safe area、触摸按压、抽屉阻尼、字体和系统缩放。
- 对手感存在争议的改动隔天复查；静态源码审计不能替代 feel-check。

### 8.4 工程质量

```text
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

- 现有 Playwright 公共页面、文章阅读、匿名聊天、移动导航、reduced-motion 和后台保护回归继续通过。
- UI 改造不自动执行数据库迁移，不修改 `.env*`，不提交密钥。
- 新公共页面继续通过 `src/lib/api/` 获取数据，并保留 i18n。

## 9. 完成定义

一项 UI 优化只有同时满足以下条件才算完成：

1. 有明确目的与频率判断，不是因为“看起来更酷”。
2. 使用共享 token 和既有 primitive，没有产生平行设计语言。
3. 覆盖 loading、empty、error、success/recovery 中适用状态。
4. 通过键盘、触摸、精细指针、亮暗主题和辅助偏好验证。
5. 通过机械测试和实际 feel-check；涉及手势时完成真机检查。
6. 未破坏受保护功能、数据 seam、TipTap 规范与安全约束。

