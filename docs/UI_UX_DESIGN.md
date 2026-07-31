# 万物流转 UI/UX 设计规范与优化路线

> 本文是项目唯一的 UI/UX 设计基线、现状审计和后续优化路线。**当前页面的整体结构、模块顺序和信息架构已经由站主确认并冻结；后续工作是在现有设计语言内优化视觉细节，不进行结构重构。** 色调比例、按钮质感、卡片层次、留白和动效可在确有美观或可用性收益时局部调整，但不得把页面改造成另一种设计风格。
>
> 本次结论来自源码静态审计。涉及弹性、速度、材质厚度和触摸手感的判断必须在浏览器与真实设备上复核，不能仅凭代码标记为完成。

## 1. 产品气质与设计原则

### 1.0 已确认的设计基线

以下内容构成项目当前的设计基线：

- 保留暖色画布、青蓝主色和玫红强调这一色彩关系；允许在同一色彩体系内微调透明度、阴影和局部层次。
- 保留桌面侧栏、公共页头、首页分区、移动底部导航、音乐播放器、卡片与内容页的总体结构。
- 保留当前圆角、Surface、字体组合和内容密度形成的整体观感；允许对阴影、留白和控件质感做局部精修。
- 保留现有适度的淡入、上浮、卡片 hover、音乐视觉反馈等动效性格；只有在无障碍、性能或明显交互错误成立时才局部调整。
- 不以“更像 Apple”“更现代”“更极简”作为改动理由。外部设计原则必须服从万物流转现有视觉。

任何会改变布局层级、模块顺序、导航位置、卡片结构或页面密度的提案默认禁止。可见的色彩、阴影、留白与动效优化必须制作同视口前后对照，确认收益后保留，不能作为代码清理顺手实施。

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

当前颜色方向以 `src/app/globals.css` 中的实际表现为基线。下表用于指导新组件融入现有设计，不授权重新配色：

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
- 后台已有粉色强调属于现有视觉的一部分，不因 token 整理改变其观感；只有出现暗色主题失真、对比度不足或同义状态明显冲突时才调整映射。
- 代码块的固定深色背景属于内容语义，可保留独立色值。
- 状态不能只依赖颜色表达；选中、错误和成功同时使用文本、图标或结构变化。

### 2.2 Surface、材质与深度

- 保留当前页面画布、内容卡片、浮动控件和模态层形成的深度关系，不统一重设 blur、透明度或阴影。
- 固定导航、移动播放器、搜索弹层继续使用现有 `backdrop-filter` 与 Surface；普通正文卡片继续沿用当前实现。
- 新增组件应从已有 Surface 中选择最接近的样式，不引入新的材质层级。
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

- `--radius: 1.25rem` 与现有内部控件圆角是已确认基线；仅要求新组件沿用，不批量重调旧组件。
- 阴影只表达层级，不表达可点击性；可点击性还需明确 hover、focus 和按压反馈。
- 页面间距使用 `rem` 与响应式 token，避免字体放大后固定 px 布局失衡。
- 正文阅读宽度保持约 `42–48rem`；集合页可放宽到约 `80rem`，首页可使用约 `93.75rem` 的复合布局。
- 相邻控件的间距必须反映关系：控制项靠近被控制内容，不用额外标签弥补错误映射。

### 2.4 排版

- 保留当前 sans-serif 正文、serif 品牌标题与中文字体组合，不更换字体风格。
- 标题 tracking、正文 leading 和标签字距以当前页面实际效果为准；下列值只用于新增的大展示标题，不批量套用现有标题：

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
- 保留当前 Header 动作、管理入口和外部社交入口的位置与优先级，不重新编排信息架构。
- 当前页面必须通过 `aria-current`、色彩和字重共同标识。
- 保留当前轻量路由淡入；只有监测到 INP、闪烁或 reduced-motion 问题时才调整，不改为更强位移动画。
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

- 保留当前 Featured、普通文章、碎片和翻页卡片的层级与形态，不重新设计卡片结构。
- 保留当前卡片 hover 位移与图片缩放幅度；仅补充触屏兼容，避免粘滞 hover，不改变桌面观感。
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

以下为源码确认的优化候选。执行时分为两类：**隐形修复**不得改变正常桌面视觉；**观感调整**默认不执行，必须先做前后截图或交互对照并由站主确认。

| Priority | Location | Before | After | Why | Verification |
| --- | --- | --- | --- | --- | --- |
| P0 | `src/app/globals.css:375,384`；ChatComposer、MobilePlayer、AddFragmentModal 等 | 多处 `transition-all` | 按各组件当前 computed style 逐项声明属性、时长与曲线，不统一改成另一组数值 | `all` 会意外动画布局或其他非 GPU 属性；修复不应改变当前手感 | `rg "transition-all" src` 应归零；前后 computed style 与录屏一致 |
| P0 | `src/app/globals.css:427–538` | 多套手写 cubic-bezier 与 duration | 在不改变计算值和当前手感的前提下提取共享 token | 先改善维护性，不能借 token 化重新调速 | 重构前后 computed style 与截图/录屏一致 |
| Optional | `src/app/globals.css:533–538`、Sidebar/PostCard 等 | 当前使用 80–480ms stagger，形成现有入场性格 | 默认保留；仅在真机确认明显拖慢后，单独实验更短 stagger | 这会直接改变页面气质，不属于隐形优化 | 前后录屏由站主确认后才可合并 |
| P0 | `RouteTransition.tsx` | 当前 220ms 纯 opacity 路由淡入 | 保留现有效果；只验证 reduced-motion 与性能 | 当前实现已克制且不使用位移，不应为理论规则删除 | 连续路由无卡顿，reduce 下无强制动画 |
| Optional | `src/components/layout/Sidebar.tsx:66–171` | 侧栏分组带现有 fade-up/fade-left 入场 | 默认保留；只有重挂载频繁或阻塞操作时再缩短 | 这是可见风格的一部分，不应自动移除 | 必须通过前后录屏确认观感 |
| P0 | PostCard、MemoryCard、Fragments、DesktopPlayer 等 | ungated `hover:-translate-*`、`hover:scale-*`、`group-hover:*` | 变换 hover 放入 `(hover: hover) and (pointer: fine)`；触屏只保留按压/焦点反馈 | 触屏会产生粘滞 hover，且装饰位移不应影响高频浏览 | Chrome touch emulation 与真机点击后无残留 hover |
| P0 | `MobilePlayer.tsx:111`、`DesktopPlayer.tsx:161` | `transition-[width] duration-200` 跟随播放进度 | 使用 `scaleX()` + `transform-origin:left`，或直接更新进度而不 tween | 持续 width 动画触发布局且造成进度追赶 | Performance 面板无持续 layout；进度紧跟音频 |
| P0 | `AdminArchiveTimeline.tsx:138–191` | `transition-all` 同时改变点的宽高与标题 padding | 保持行几何稳定，只动画颜色、opacity 或 transform | hover 造成布局重排和文字位移，降低表格扫描稳定性 | 快速扫过多行时无文字横跳与 layout shift |
| P0 | `globals.css:61–72` | reduced motion 将全局 animation/transition 近乎全部清零 | 移除位置和弹性，保留短 opacity/color/border 状态反馈 | 无障碍模式仍需要理解状态变化 | 模拟 reduce，状态仍清晰且无位移动画 |
| Optional | `ModelPicker.tsx:66`、`ConversationList.tsx:204`、DesktopPlayer 面板 | 锚定面板使用当前纯淡入或固定方向入场 | 可实验 origin-aware `opacity + scale(0.97)`，但默认不改 | 新效果可能更“正确”却不符合当前页面气质 | 先制作交互对照，由站主选择 |
| Optional | `src/components/ui/dialog.tsx:19,53` | Dialog 使用当前纯淡入 | 可实验中心 `opacity + scale(0.96)`，但默认不改 | 纯淡入本身没有功能错误，新增 scale 是观感变化 | 先制作交互对照，由站主选择 |
| Optional | `src/components/ui/Toast.tsx:17–42` | 条件卸载 + `anim-fade-up`，只有进入没有可观察退出 | 若实际观察到消失突兀，再实验保持现有造型与入场感的同边缘退出 | 增加退出会改变现有节奏，不能只凭代码判定更好 | 先制作连续触发与手动关闭对照，由站主选择 |
| Optional | Button 与散落图标按钮 | Button primitive 为 `scale(0.97)`，部分业务按钮为 `scale(0.95)` 或无 active | 默认保留当前差异；只有同类按钮出现明显手感冲突时才局部对齐 | 不同尺寸和用途可以拥有不同按压幅度，机械统一可能变差 | 同场景实机对比后再决定，不全局替换 |
| P1 | `MainLayout.tsx:163`、后台 EditorMenus/Archive | 局部存在硬编码背景和 `pink-*` | 仅在保持当前可见颜色不变时映射为语义 token；若颜色会变化则不做 | 改善主题维护性，但现有粉色强调不是待删除问题 | 前后取色值与截图一致，暗色主题无回归 |
| Optional | `globals.css:418–538` 与多个首页/列表组件 | 多个区块使用当前 `fade-up` 入场 | 默认保留；只针对被性能数据或真机体验证明有问题的组件调整 | 入场动效是当前页面整体观感的一部分 | 单组件实验，不允许全局批量删除 |
| P1 | 全局 Surface、搜索、移动 chrome | 透明材质有 reduced-motion，但无 reduced-transparency/contrast 方案 | 增加透明度与对比度媒体查询的设计与实现规范 | blur 在部分用户和复杂背景上会降低可读性 | 模拟对应媒体特性，文本与边界保持清晰 |

### 5.1 审计结论

当前 UI 的品牌、色调、结构、组件形态和动效性格均已确认，不需要重做，也不需要向其他设计体系靠拢。最高杠杆是完成不改变外观的维护性、性能、触屏和无障碍修复；凡是会改变当前观感的动效、颜色、材质或布局调整都属于可选实验，而不是默认路线。

## 6. 可选动效实验（默认不实施）

以下机会仅供未来单独试验，不属于当前优化任务。每项必须提供现状/实验版对照，由站主确认后才能实施。

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

1. 在保持当前 computed timing 不变的前提下建立共享 easing/duration token。
2. 清理 `transition-all`，但保持正常桌面状态下的颜色、位移、阴影、时长和曲线不变。
3. 为现有 hover transform 补充精细指针限制；桌面 hover 视觉不变。
4. 修正 reduced-motion，使其移除运动同时保留必要状态反馈；默认模式视觉不变。
5. 优化播放器进度与后台时间线的布局性能，结果外观和交互语义不变。

边界：不改变 DOM 信息架构、不引入 Motion 依赖、不修改业务状态和 API。

验证：

- `rg "transition-all|transition-\\[width\\]" src`
- DevTools Performance 检查播放器进度和后台 hover 无持续 layout。
- 模拟 touch、reduced motion，确认无粘滞 hover且状态仍可理解。

### P1 — 在现有风格内补齐细节

1. 保留 Button 与图标按钮当前按压反馈；只修复同一组件在相同状态下的不一致或缺失 focus。
2. 保留 Dialog、Popover 当前视觉；只修复焦点、快速开关或退出状态等实际问题。
3. 先验证 Toast 是否存在真实的退出/连续触发问题；只有问题成立且实验版获确认后才调整。
4. 在取色值不变的前提下整理后台硬编码颜色；保留当前粉色强调。
5. 增加 reduced-transparency 与 prefers-contrast 设计降级。
6. 保留首屏和列表动画；只记录真实性能问题，不做全局删减。

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

边界：P2 不因“更像 Apple”自动成立；没有清晰用户收益和站主对实验版的明确选择就不实现。

## 8. 验收标准

### 8.1 视觉与响应式

- 每项隐形优化必须通过修改前后截图对比；除目标 bug 外，页面结构、色调、间距、卡片形态和总体动效观感保持一致。
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

