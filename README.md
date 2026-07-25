# 万物流转 · Everything Flows

个人站点 [flows.xin](https://flows.xin) — 博客为主，预留工具与 AI 扩展。

仓库：[github.com/hanasakachiyuki/everythingflows](https://github.com/hanasakichiyuki/everythingflows)

## 功能

| 功能 | 实现 |
|------|------|
| 写文章 | `/admin` 富文本 → 发布到 **Supabase** |
| 标签 / 归档 / 搜索 | 从 Supabase 查询 |
| B 站视频 | 旧 MDX 文章仍支持 `<Bilibili />`；新文章可嵌入 iframe |
| 评论 | Giscus（`site.config.json`） |
| 暗色模式 | next-themes |
| 网易云音乐 | MetingJS + APlayer（`site.config.json`） |
| AI 对话 | `/chat`，基于 Vercel AI SDK，支持多模型 |
| 多语言 | next-intl（当前仅 `zh`，`localePrefix: "never"` 无 URL 前缀） |

## 技术栈

- **前端**: Next.js 16 (App Router), React 19, Tailwind CSS, TypeScript 5
- **内容**: Supabase PostgreSQL
- **AI**: Vercel AI SDK（Google / OpenAI / Anthropic / OpenAI 兼容自定义端点）
- **评论**: Giscus
- **部署**: Vercel（推荐）

## 快速开始

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # 仓库未自带 .env.example，请按下方「环境变量」手动创建
pnpm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 环境变量

参考 [`.env.example`](.env.example)。关键变量：

```env
# —— Supabase ——
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # 公共读（anon key，受 RLS 约束）
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # 管理写 + 草稿读（service role，绕过 RLS）

# —— 博客管理 ——
# 注意：ADMIN_SECRET 目前是 vestigial 配置，代码中 verifyAdminSecret() 无任何引用。
# /admin 现在纯靠 Supabase session 鉴权。保留此变量仅为兼容旧部署。
ADMIN_SECRET=your-long-secret

# —— 站点 ——
NEXT_PUBLIC_SITE_URL=https://flows.xin

# —— AI 对话 ——
# 模型注册表在 ai-models.json（项目根目录）。
# 每个模型声明自己的 apiKeyEnv / baseUrlEnv，代码按声明的 env 变量名读取。
# 加新 provider 只需改 ai-models.json + .env.local，无需改代码。
# 具体见下方「AI 对话 → 添加 / 修改模型」。
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
ZHIPU_API_KEY=...
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

**AI 模型选择规则**：

- 模型注册表在 `ai-models.json`（项目根目录），每个模型标注 `isFree` + 声明自己的 `apiKeyEnv`。
- `getAvailableModels()` 返回所有「`apiKeyEnv` 指向的环境变量已配置」的模型。
- **匿名用户**（未登录）只能使用第一个 `isFree: true` 且已配置的模型；无免费模型时 `/chat` 对匿名关闭。
- **登录用户**可在 `/chat` 顶部 ModelPicker 切换所有已配置模型。
- 默认模型 = 第一个可用的免费模型，否则第一个可用模型，否则回退到 `gemini-2.0-flash`。

## Supabase 配置

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目。
2. 在 **SQL Editor** 按顺序执行：

   | 顺序 | 文件 | 说明 |
   |------|------|------|
   | 1 | [`supabase/schema.sql`](supabase/schema.sql) | `posts` 等核心表 + RLS |
   | 2 | [`supabase/storage.sql`](supabase/storage.sql) | `post-images` 存储桶 |
   | 3 | [`supabase/schema-chat.sql`](supabase/schema-chat.sql) | `chat_conversations` / `chat_messages` + RLS |

3. 启用 Email/Password 登录（Auth → Providers → Email），创建一个用户作为管理员。
4. 用该用户登录后访问 `/admin` 即可写作，发布后点 **发布**。

详见 [`src/lib/api/supabase/README.md`](src/lib/api/supabase/README.md)。

## AI 对话（`/chat`）

### 行为

| | 匿名用户 | 登录用户 |
|---|---|---|
| 访问 `/chat` | ✅ | ✅ |
| 发送消息 | ✅ 仅免费模型 | ✅ 可切换模型 |
| 模型切换 | ❌ 按钮禁用 | ✅ |
| 对话历史 | ❌ 不持久化（仅当前会话） | ✅ 保存到 Supabase |
| 重命名 / 删除对话 | ❌ | ✅ |
| 系统提示词 | ❌ | ✅（创建对话时设置） |
| 速率限制 | 10 次/分钟/IP + 单条 ≤4000 字符 + 单次 ≤20 条消息 | 无额外限制 |

### 数据存储

- `chat_conversations(id, user_id, title, model_id, system_prompt, created_at, updated_at)`
- `chat_messages(id, conversation_id, role, content, model_id, created_at)`
- `user_id NOT NULL` 外键 `auth.users(id) on delete cascade` — 匿名用户**不落库**，因此 RLS 不会被绕过。
- RLS：`auth.uid() = user_id`；消息表通过子查询关联对话表校验所有权。
- 触发器自动维护 `updated_at`（对话更新 + 插入消息时）。

### 速率限制说明

`src/app/api/chat/route.ts` 内置内存级 IP 速率限制（匿名用户 10 次/分钟）。

- 单实例部署（Vercel Hobby / 自托管）够用。
- 多实例 / Edge 部署时每个实例独立计数，实际阈值会放宽。如需严格限制建议替换为 Upstash Redis 或 Supabase RPC 计数。

### 添加 / 修改模型

模型注册表是配置文件 [`ai-models.json`](ai-models.json)（项目根目录），**不硬编码在代码里**。加新模型只需改这个 JSON + `.env.local`，无需改任何 `.ts` 代码。

#### 配置文件结构

```json
{
  "models": [
    {
      "id": "glm-4-flash",
      "name": "GLM-4 Flash",
      "provider": "openai",
      "modelId": "glm-4-flash",
      "isFree": true,
      "description": "智谱 GLM 免费快速模型",
      "maxOutputTokens": 4096,
      "apiKeyEnv": "ZHIPU_API_KEY",
      "baseUrlEnv": "ZHIPU_BASE_URL"
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 站内唯一标识，会存进数据库 `model_id` 列。改名会让旧对话显示不出模型名 |
| `name` | string | ModelPicker 显示名 |
| `provider` | `"google"` \| `"openai"` \| `"anthropic"` | 决定用哪个 AI SDK。**OpenAI 兼容端点（DeepSeek/GLM/OpenRouter 等）统一用 `"openai"`** |
| `modelId` | string | provider 侧的真实模型 id（如 `glm-4-flash`、`deepseek-chat`） |
| `isFree` | boolean | `true` = 匿名用户可用；至少要有一个 `isFree: true` 且已配置的模型，否则 `/chat` 对匿名关闭 |
| `description` | string | ModelPicker 下方说明文字 |
| `maxOutputTokens` | number? | 可选，输出 token 上限 |
| `apiKeyEnv` | string | **读取 API Key 的环境变量名**。每个模型独立指定，实现多 provider 并存 |
| `baseUrlEnv` | string? | 读取 Base URL 的环境变量名。OpenAI 兼容端点必填 |
| `api` | `"responses"` \| `"chat"`? | 仅 `provider: "openai"` 生效。默认 `"responses"`（OpenAI 官方 Responses API，走 `/responses`）。**第三方兼容端点（DeepSeek/GLM/OpenRouter 等）必须设为 `"chat"`**（走 `/chat/completions`） |

#### `provider` 字段决定什么？

`provider` **只决定用哪个 AI SDK**（Google SDK / OpenAI SDK / Anthropic SDK），**不决定读哪个 env**。env 读取完全由 `apiKeyEnv` / `baseUrlEnv` 字段控制。

- `google` → `@ai-sdk/google`（Gemini 系列）
- `openai` → `@ai-sdk/openai`（OpenAI 官方 + 所有 OpenAI 兼容端点：DeepSeek、智谱 GLM、OpenRouter、Moonshot 等）
- `anthropic` → `@ai-sdk/anthropic`（Claude 系列）

> 💡 **判断用哪个 provider**：看目标 API 是否兼容 OpenAI Chat Completions 格式。是 → `openai`；原生 Google/Anthropic API → 对应 `google`/`anthropic`。

#### 例子：同时启用 DeepSeek + GLM + OpenAI

这正是新架构的核心能力——多个 OpenAI 兼容端点并存，旧架构做不到。

1. `ai-models.json` 里每个模型指定独立的 env（配置文件已预置这三个）：
   ```json
   { "id": "gpt-4o",        "provider": "openai", "apiKeyEnv": "OPENAI_API_KEY",   "baseUrlEnv": "OPENAI_BASE_URL" }
   { "id": "deepseek-chat", "provider": "openai", "apiKeyEnv": "DEEPSEEK_API_KEY", "baseUrlEnv": "DEEPSEEK_BASE_URL" }
   { "id": "glm-4-flash",   "provider": "openai", "apiKeyEnv": "ZHIPU_API_KEY",    "baseUrlEnv": "ZHIPU_BASE_URL" }
   ```
2. `.env.local` 分别配置：
   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_BASE_URL=                       # 留空用 OpenAI 官方默认
   DEEPSEEK_API_KEY=sk-deepseek-xxx
   DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
   ZHIPU_API_KEY=xxx.zhipu-xxx
   ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
   ```
3. 重启 dev server。三个模型都会出现在登录用户的 ModelPicker 里。

#### 例子：让匿名用户也能用某个模型

把它的 `isFree` 设为 `true`，并确保其 `apiKeyEnv` 指向的 env 变量已配置。匿名用户会自动用 `getAvailableModels()` 里第一个 `isFree: true` 的模型——想指定默认免费模型，调整它在 `models` 数组里的顺序即可。

#### 例子：接入全新 provider（如 Moonshot Kimi）

1. 确认 API 是 OpenAI 兼容（Moonshot 是）→ 用 `provider: "openai"`。
2. `ai-models.json` 加：
   ```json
   {
     "id": "moonshot-v1-8k",
     "name": "Kimi v1 8k",
     "provider": "openai",
     "modelId": "moonshot-v1-8k",
     "isFree": false,
     "description": "Moonshot Kimi 长上下文模型",
     "maxOutputTokens": 8192,
     "apiKeyEnv": "MOONSHOT_API_KEY",
     "baseUrlEnv": "MOONSHOT_BASE_URL"
   }
   ```
3. `.env.local` 加：
   ```env
   MOONSHOT_API_KEY=sk-xxx
   MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
   ```
4. 重启 dev server。**零代码改动**。

#### 删除模型

直接从 `ai-models.json` 的 `models` 数组移除即可。已有对话的 `model_id` 列仍保留旧值，前端 ModelPicker 找不到对应项时会显示 `"选择模型"`，不影响历史消息查看。如需彻底清理可手动 update 数据库。

#### 从旧架构升级

如果你之前用旧的 `AI_API_KEY` / `AI_BASE_URL` / `GOOGLE_API_KEY` 环境变量：新架构不再读取这些变量名（除非 `ai-models.json` 里某模型的 `apiKeyEnv` 显式指向它们）。请改用 `.env.example` 里的标准变量名，或在 `ai-models.json` 里把 `apiKeyEnv` 字段改成你现有的 env 变量名。

## 其他配置

1. **`site.config.json`** — 站点名、头像、GitHub、网易云、Giscus、`features` 开关
2. **头像** — `public/avatar/avatar.png`
3. **评论** — [giscus.app](https://giscus.app) 配置 `repoId` / `categoryId`

## 部署 Vercel

1. 导入 [GitHub 仓库](https://github.com/hanasakichiyuki/everythingflows)
2. 环境变量：按上方「环境变量」全部填入（至少 Supabase 三件套 + `ADMIN_SECRET`）
3. `NEXT_PUBLIC_SITE_URL=https://flows.xin`
4. 域名 CNAME 到 Vercel

## 目录结构

```
ai-models.json            # AI 模型注册表（配置驱动，加模型改这里 + .env）
supabase/
  schema.sql              # posts 等核心表
  storage.sql             # post-images 存储桶
  schema-chat.sql         # AI 对话表 + RLS
.env.example              # 环境变量模板
site.config.json
src/
  app/[locale]/           # 页面（i18n）
  app/actions/            # Server Actions（posts / chat）
  app/api/chat/           # AI 流式聊天端点
  lib/api/                # 数据抽象层（posts.ts / chat.ts 委托给 supabase/）
  lib/api/supabase/       # Supabase 实现
  lib/services/ai/        # AI provider 解析（读 ai-models.json + env）
  components/chat/        # 聊天 UI
  components/admin/       # 富文本编辑器
  hooks/useChatState.ts   # 聊天状态管理
messages/
```

## 许可证

MIT
