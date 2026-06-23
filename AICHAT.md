# AI Chat 技术文档

> 本文档对应 `万物流转` 项目 AI Chat 模块，记录技术方案、核心逻辑、优化措施与后续规划。
> 最后更新：2026-06-23

---

## 目录

1. [架构总览](#1-架构总览)
2. [技术栈与依赖](#2-技术栈与依赖)
3. [数据模型](#3-数据模型)
4. [模型注册表与多 Provider 支持](#4-模型注册表与多-provider-支持)
5. [鉴权与匿名访问](#5-鉴权与匿名访问)
6. [流式响应与模型 Fallback](#6-流式响应与模型-fallback)
7. [短期记忆：滑动窗口 + 滚动摘要](#7-短期记忆滑动窗口--滚动摘要)
8. [速率限制](#8-速率限制)
9. [前端状态管理](#9-前端状态管理)
10. [UI 组件结构与渲染优化](#10-ui-组件结构与渲染优化)
11. [Markdown 渲染与复制体验](#11-markdown-渲染与复制体验)
12. [System Prompt 与角色设定](#12-system-prompt-与角色设定)
13. [日志体系](#13-日志体系)
14. [环境变量](#14-环境变量)
15. [后续规划](#15-后续规划)

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                       浏览器（Client）                        │
│                                                              │
│  ChatShell ── ChatPanel ── useChat (@ai-sdk/react)           │
│       │           │                                          │
│       │           └─ DefaultChatTransport (SSE + credentials)│
│       │                                                      │
│  useChatState (登录: Server Action / 匿名: localStorage)     │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/chat (SSE)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Route (Server)                        │
│  src/app/api/chat/route.ts                                  │
│                                                              │
│  1. 鉴权 (Supabase getUser)                                  │
│  2. 速率限制（匿名）                                          │
│  3. 消息校验                                                  │
│  4. 模型解析 + 候选列表构建                                   │
│  5. 短期记忆裁剪 (memory.ts)                                 │
│  6. streamText + 流式 fallback                              │
│  7. onFinish 保存到 Supabase                                 │
└──────┬──────────────┬───────────────────┬───────────────────┘
       │              │                   │
       ▼              ▼                   ▼
  Supabase DB    Upstash Redis      AI Provider
  (持久化)       (摘要缓存)         (GLM/Gemini/OpenAI/Claude)
```

**设计原则：**
- **Server Component 优先**，仅在必须客户端交互处用 `"use client"`
- **数据抽象层** `src/lib/api/chat.ts` 为 seam，可替换底层实现（详见 AGENTS.md）
- **渐进降级** — Upstash 未配置、摘要模型不可用、模型限流均有自动降级路径，不报错
- **零硬编码模型** — 全部通过 `ai-models.json` 注册表配置，加新模型不改代码

---

## 2. 技术栈与依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `ai` (AI SDK) | ^6.0.207 | `streamText`/`generateText`/`useChat`/`DefaultChatTransport` |
| `@ai-sdk/openai` | — | OpenAI 及兼容端点（GLM/DeepSeek） |
| `@ai-sdk/google` | — | Gemini |
| `@ai-sdk/anthropic` | — | Claude |
| `@ai-sdk/react` | — | 客户端 `useChat` hook |
| `@supabase/ssr` | — | SSR 会话 + cookie 同步 |
| `@upstash/redis` | ^2.x | 摘要缓存（REST 模式，兼容 serverless） |
| `react-markdown` + `remark-gfm` + `rehype-highlight` | — | Markdown 渲染 + 代码高亮 |

> **注：** AI SDK v6 无内置 `countTokens`，token 估算使用启发式（见 §7.2）。

---

## 3. 数据模型

### 3.1 Supabase 表结构

完整 schema 见 `supabase/schema-chat.sql`，运行顺序：`schema.sql` → `storage.sql` → `schema-chat.sql`。

#### `chat_conversations`（对话表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `user_id` | uuid (FK → auth.users) | `on delete cascade` |
| `title` | text | 默认 `'新对话'`，用户首条消息前 20 字 |
| `model_id` | text | 站内模型 id（对应 `ai-models.json` 的 `id`） |
| `skill_id` | text (null) | 预留，当前未启用 UI 选择 |
| `system_prompt` | text (null) | 自定义系统提示词，null 时用 DEFAULT_SYSTEM_PROMPT |
| `created_at` / `updated_at` | timestamptz | `updated_at` 由触发器自动维护 |

索引：`(user_id, updated_at desc)`。

#### `chat_messages`（消息表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid (PK) | |
| `conversation_id` | uuid (FK) | `on delete cascade` |
| `role` | text | `'user'` / `'assistant'` / `'system'`（check 约束） |
| `content` | text | |
| `model_id` | text (null) | 助手消息记录的实际生成模型（fallback 后可能与对话配置不同） |
| `created_at` | timestamptz | |

索引：`(conversation_id, created_at asc)`。

### 3.2 触发器

- `touch_updated_at` — `chat_conversations` before update 时刷新 `updated_at`
- `touch_conversation_on_message` — `chat_messages` after insert 时 touch 对话的 `updated_at`

### 3.3 RLS

两张表均启用 RLS，策略：
- `chat_conversations`: `auth.uid() = user_id`（所有操作）
- `chat_messages`: 通过子查询校验 `conversation.user_id = auth.uid()`（所有操作）

> **注意：** API route 实际通过 `getSupabaseAdmin()`（service role，绕过 RLS）读写，并自行校验 `verifyConversationOwnership`。RLLS 是底层兜底。

### 3.4 TypeScript 类型

`src/types/chat.ts` 定义 `Conversation`/`Message`/`ChatMessage`/`CreateConversationInput`/`UpdateConversationInput`/`CreateMessageInput`/`PaginatedResult<T>`。

### 3.5 数据抽象层（seam）

```
src/app/actions/chat.ts  →  src/lib/api/chat.ts  →  src/lib/api/supabase/chat.ts
（Server Action）         （seam 接口）            （唯一实现：Supabase）
```

替换数据库时新增同签名实现模块并在 `chat.ts` re-point 即可，调用方不变（见 AGENTS.md "Data abstraction"）。

---

## 4. 模型注册表与多 Provider 支持

### 4.1 配置文件：`ai-models.json`

位于项目根目录，schema 见 `src/lib/services/ai/ai-models.schema.json`。

**字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✓ | 站内唯一标识，存入 DB `model_id` 列，改名会让旧对话失模型名 |
| `name` | ✓ | ModelPicker 显示名 |
| `provider` | ✓ | `google` / `openai` / `anthropic`，决定用哪个 AI SDK |
| `modelId` | ✓ | provider 侧真实模型 id（如 `glm-4.7-flash`） |
| `isFree` | ✓ | `true` = 匿名可用；至少一个 `isFree=true` 且 apiKeyEnv 已配置，否则 /chat 对匿名关闭 |
| `description` | ✓ | ModelPicker 下方说明 |
| `maxOutputTokens` | — | 输出 token 上限 |
| `contextWindow` | — | 输入上下文窗口（token 上限），用于短期记忆裁剪；未配置时兜底 32768 |
| `apiKeyEnv` | ✓ | 读取 API Key 的环境变量名 |
| `baseUrlEnv` | — | 读取 Base URL 的环境变量名（OpenAI 兼容端点必填） |
| `api` | — | 仅 `provider="openai"`：`"responses"`（OpenAI 官方，默认）/ `"chat"`（兼容端点必用） |

**当前已注册模型（9 个）：**

| id | provider | isFree | contextWindow | api |
|----|----------|--------|---------------|-----|
| opencode-deepseek-chat | openai | ✓ | 64000 | chat |
| glm-4.7-flash | openai | ✓ | 128000 | chat |
| gemini-2.0-flash | google | ✓ | 1000000 | — |
| gemini-2.5-flash | google | ✓ | 1000000 | — |
| gpt-4o-mini | openai | ✗ | 128000 | responses |
| gpt-4o | openai | ✗ | 128000 | responses |
| claude-3.5-haiku | anthropic | ✗ | 200000 | — |
| claude-sonnet-4 | anthropic | ✗ | 200000 | — |
| deepseek-chat | openai | ✗ | 64000 | chat |

### 4.2 Provider 解析与缓存

`src/lib/services/ai/index.ts` 的 `getProvider(config)` 按 `provider` 字段创建对应 AI SDK 客户端，并以 `provider:apiKey:baseURL:api` 为 key 缓存 provider 工厂函数（模块级 `Map`），避免重复构造。

`api` 字段路由：
- `"chat"` → `provider.chat(modelId)` → Chat Completions API (`/chat/completions`)，第三方兼容端点必用
- `"responses"`（默认）→ `provider.responses(modelId)` → Responses API (`/responses`)，OpenAI 官方

### 4.3 模型解析流程

`getModel(modelId?)` (`src/lib/services/ai/index.ts:80`)：
1. 未传 modelId → 用 `getDefaultModelId()`（优先第一个已配置的免费模型，否则第一个已配置模型）
2. `resolveModelConfig(id)` 读 env 取 apiKey/baseURL/contextWindow
3. 未配置 → 抛错，列出可用模型
4. `getProvider(config)` 构造 `LanguageModel`

### 4.4 加新模型流程

1. `ai-models.json` 加条目（指定 `apiKeyEnv`/`baseUrlEnv`/`api`）
2. `.env.local` 设置对应环境变量
3. **不需要改任何代码**

---

## 5. 鉴权与匿名访问

### 5.1 鉴权链路

```
浏览器 login (Supabase Auth)
  ↓ 设置 auth cookie
proxy.ts (middleware) — updateSession 刷新 session
  ↓
/api/chat route — createClient() (server-client.ts) 读 cookie
  ↓ supabase.auth.getUser()
  ↓
有 user → 登录路径 | 无 user → 匿名路径
```

### 5.2 关键修复：credentials

`DefaultChatTransport` **默认 `credentials: "omit"`**，导致发到 `/api/chat` 的请求不带 cookie，后端 `getUser()` 永远返回 null。

**修复（`src/components/chat/ChatPanel.tsx:62`）：**
```ts
new DefaultChatTransport({
  api: "/api/chat",
  credentials: "include",  // ← 必须显式设置
  body: { conversationId, modelId },
});
```

### 5.3 匿名 vs 登录用户差异

| 能力 | 匿名 | 登录 |
|------|------|------|
| 模型选择 | 仅免费模型（可切换） | 全部已配置模型 |
| 对话持久化 | localStorage（`ef:chat:conversations` / `ef:chat:messages`） | Supabase DB |
| 消息保存 | 不保存（route 不写 DB） | 保存 user + assistant 消息 |
| 消息上限 | 每日 30 次（按 IP+UTC 日期）/ 单条 ≤4000 字符 / 单次请求 ≤100 条 | 无限制 |
| 速率限制 | 每日 30 次（Upstash 分布式） | 无 |
| 短期记忆 | 纯滑窗截断（不摘要） | 滑窗 + Upstash 摘要缓存 |
| System Prompt | `DEFAULT_SYSTEM_PROMPT` | 对话自定义 or DEFAULT |

### 5.4 匿名用户模型选择

匿名用户可在 UI 切换免费模型（`ChatShell` 过滤 `models.filter(m => m.isFree)`）。选择存入 localStorage 的虚拟 conversation 的 `modelId`，请求时通过 `body.modelId` 传给后端。

后端校验（`route.ts:206-214`）：
- `body.modelId` 必须在已配置的免费模型列表中
- 否则回退第一个免费模型

### 5.5 Server Action 层

`src/app/actions/chat.ts` 提供：
- `createConversationAction` — 匿名返回虚拟 conversation（不持久化）
- `getCurrentUserAction` / `getConversationAction` / `listConversationsAction`
- `updateConversationAction` / `deleteConversationAction`
- `createMessageAction` — 匿名直接返回成功（不写 DB）
- `getMessagesAction` — 匿名返回空
- `getAvailableModelsAction`

所有 action 用 `handle()` wrapper 统一捕获异常，返回 `ActionResult<T>`（`{ ok: true, data } | { ok: false, error }`）。

---

## 6. 流式响应与模型 Fallback

### 6.1 候选模型构建

`buildCandidateModelIds(primary)` (`route.ts:117`)：
- 主模型优先
- 追加其它已配置的免费模型（去重）
- 顺序尝试，首个可用即用

### 6.2 无预检流式 Fallback

**不做预检**（不浪费一次请求探测），在真实流式请求产出首 chunk 后判断成败：

```
for (const candidateId of candidateIds) {
  const result = streamText({ model, messages, system, ... });
  const aiResponse = result.toUIMessageStreamResponse({ onError });
  
  // peek 首个字节块
  const firstBytes = await bodyReader.read();
  const headText = decode(firstBytes);
  
  if (headText.includes('"type":"error"')) {
    // 该模型挂了（如 GLM 限流），切下一个
    continue;
  }
  
  // 成功：首块 + 剩余字节透传给客户端
  return new Response(combinedStream, { headers: aiResponse.headers });
}
```

**关键点：**
- SSE error part 形如 `data: {"type":"error",...}\n\n`，字符串包含检测即可
- 成功后用 `ReadableStream` 组合首块 + 剩余字节，保留原响应头（含 SSE content-type）
- 所有候选失败返回 502

### 6.3 `onFinish` 持久化

仅在登录用户 + 有 conversationId + 非空 text 时保存 assistant 消息。`modelId` 记录的是**实际生成所用 candidateId**，不是对话配置的模型（fallback 后可能不同）。

---

## 7. 短期记忆：滑动窗口 + 滚动摘要

### 7.1 整体策略

`src/lib/services/ai/memory.ts` 的 `buildContextWithMemory()` 是主入口。

```
全量消息 → 估算 token
            ↓
      ≤ contextWindow × 60% ?  ── 是 ──→ 原样发送，零开销
            ↓ 否
      切分：recent(最近 8 条) + toSummarize(更早的)
            ↓
      有 conversationId ?
        ├ 是（登录）→ 查 Upstash 缓存 → 增量摘要 → 写回 → 摘要拼进 system
        └ 否（匿名）→ 纯滑窗，丢弃 toSummarize
            ↓
      摘要失败/Upstash 不可用 → 降级纯滑窗
```

### 7.2 启发式 Token 估算

AI SDK v6 无内置 `countTokens`，使用启发式：

```ts
estimateTokens(text):
  CJK 字符 × 1.5 + ASCII 字符 / 4   (向上取整)

estimateMessagesTokens(messages):
  Σ(estimateTokens(content) + 10)   // 每条消息 +10 token 固定开销
```

**CJK 检测**（`isCJK(code)`）：覆盖 15 个 Unicode 区块，含 CJK 基本块、扩展区 A/B/C/D/E/F/G+、假名、谚文、全角符号等。

> **注：** JS `for (const ch of text)` 已按码点遍历，代理对不会拆分；`ch.codePointAt(0)` 返回完整码点。早期 Issue 误判此为 bug，实测无问题，只需补全码点范围。

**估算特性：** 偏高以保留安全余量。实际触发摘要的阈值比理论值保守。

### 7.3 关键参数（`memory.ts` 常量）

| 常量 | 值 | 说明 |
|------|-----|------|
| `RECENT_KEEP` | 8 | 保留最近 8 条原文不参与摘要 |
| `SUMMARY_THRESHOLD_RATIO` | 0.6 | 超 contextWindow × 60% 触发摘要（保守） |
| `SUMMARY_KEY_PREFIX` | `chat:summary:` | Upstash key 前缀 |
| `SUMMARY_TTL_SECONDS` | 7 天 | 摘要缓存过期时间（写入时续期） |
| `SUMMARY_MAX_TOKENS` | 512 | 摘要输出上限（控制成本） |
| `DEFAULT_CONTEXT_WINDOW` | 32768 | contextWindow 未配置时的兜底 |

### 7.4 contextWindow 选择

route.ts 取所有候选模型中**最小的** contextWindow 作为裁剪依据，确保即使 fallback 到小窗口模型也不会超限。

### 7.5 增量摘要

避免每次都重新摘要整段历史：

```
cached = redis.get("chat:summary:{convId}")  // { text, count }
// count = 摘要已覆盖的消息条数

if (cached && cached.count <= toSummarize.length) {
  newToSummarize = toSummarize.slice(cached.count)  // 只摘要新增部分
  prompt = 已有摘要 + 新追加对话 → 输出更新后的完整摘要
} else {
  newToSummarize = toSummarize  // 完整摘要
}
```

写回：`redis.set(key, { text: updated, count: toSummarize.length }, { ex: 7天 })`

### 7.6 摘要模型

使用**第一个已配置的免费模型**（`getSummarizerModel()`）做摘要，省钱且不占用主模型配额。不可用时返回 null，调用方降级为纯滑窗。

摘要 system prompt：
> 你是对话摘要助手。把给定对话历史压缩成简洁的中文摘要，保留关键事实、用户偏好、未完成的话题与重要结论。不要编造，不要寒暄，用一段连贯的话直接输出摘要内容。

### 7.7 摘要注入方式

拼进 system prompt（不进 messages 数组）：

```
{原 system prompt}

---
以下为之前对话的摘要，供你延续上下文：
{摘要内容}
```

### 7.8 降级链路

```
Upstash 未配置       → 纯滑窗（getRedis() === null）
摘要模型不可用       → 纯滑窗（getSummarizerModel() === null）
generateText 失败    → 纯滑窗（catch 返回 null）
redis get/set 失败   → 降级但继续（catch 记日志，不抛错）
```

所有降级路径都不报错，保证聊天可用。

### 7.9 Upstash Redis 客户端

`src/lib/upstash/client.ts` 的 `getRedis()` 单例：
- 读 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- 任一缺失返回 `null`（模块级单例，首次调用后缓存结果）
- REST 模式，兼容 serverless / Edge runtime
- **共用消费方：** 短期记忆摘要缓存（`memory.ts`）+ 匿名用户每日限流（`route.ts`）

---

## 8. 速率限制

仅对匿名用户生效。日限 + 单次防御性校验两层（已移除每分钟速率限制，避免与日限重复防护）。

### 8.1 每日请求上限（防滥用）

- **限制：** 每 IP 每天（UTC 日）最多 30 次请求
- **实现：** `checkAnonDailyLimit(ip)`，Upstash Redis 优先，降级进程内 Map
  - **Upstash（推荐）：** `INCR chat:daily:{ip}:{YYYY-MM-DD}`，首次设置 TTL 到 UTC 次日 00:00。原子操作，多实例全局计数
  - **降级：** 进程内 `Map<ip, { count, date }>`，日期切换重置。仅单实例生效
- **错误消息：** `匿名用户每日最多发送 30 条消息，今日已用 N 次，请登录后继续使用`（429）
- **与短期记忆共用同一个 Upstash 实例**，无需额外配置
- **进程内降级内存清理：** 每 5 分钟清理跨日旧条目，定时器 `unref()` 不阻止进程退出

### 8.2 单次请求防御性上限

- 单次请求 messages 数组最多 100 条（`ANON_MAX_MESSAGES_PER_REQUEST`）
- 单条消息最多 4000 字符（`ANON_MAX_MESSAGE_CHARS`）
- 这两项是防御性校验，正常使用不会触发

---

## 9. 前端状态管理

### 9.1 `useChatState` hook

`src/hooks/useChatState.ts` — chat 模块的核心状态容器。

**State：**
```ts
{
  conversations, activeConversation, messages, models,
  loading, messagesLoading, error, isAuthenticated
}
```

**关键回调：**
- `handleNew` — 进入空状态页面
- `handleCreateAndSend(firstMessage, modelId?)` — 空状态首条消息，创建对话（匿名: 本地虚拟 / 登录: Server Action）
- `handleSelect` / `handleDelete` / `handleRename`
- `handleSwitchModel(id, modelId)` — 匿名更新本地 + localStorage，登录调 action
- `onMessagesChange` — 匿名用户防抖 400ms 写入 localStorage

**登录状态同步：** `isAuthenticatedRef`（ref）避免回调依赖频繁变化，`useEffect` 同步 ref。

### 9.2 匿名用户 localStorage

| key | 内容 |
|-----|------|
| `ef:chat:conversations` | `Conversation[]` |
| `ef:chat:messages` | `Record<convId, Message[]>` |

读写均有 try/catch，SSR 时（`typeof window === "undefined"`）返回空。

### 9.3 消息流

```
用户输入 → ChatComposer → handleSend
  ↓
sendMessage({ text })  // useChat，立即发送（乐观更新）
  ↓
createMessageAction({ role: "user", content })  // 后台异步存 DB（登录用户）
  ↓
SSE 流 → useChat 自动更新 messages → displayMessages → MessageList
  ↓
onFinish (服务端) → saveMessage({ role: "assistant" })  // 登录用户
```

`displayMessages` 通过 `useMemo` 从 `useChat` 的 `messages` 转换，排序天然正确，无本地 state 同步问题。

---

## 10. UI 组件结构与渲染优化

### 10.1 组件树

```
ChatShell
├── ConversationList (侧边栏)
├── ChatPanel (有活跃对话)
│   ├── MessageList
│   │   ├── MessageItem (memo)
│   │   │   └── MarkdownContent (memo)
│   │   ├── ThinkingDots
│   │   └── ChatScrollbar
│   ├── ChatComposer
│   └── ChatError
└── ChatEmptyPanel (无活跃对话)
    ├── ModelPicker
    └── ChatComposer
```

### 10.2 流式渲染优化（关键）

**问题：** 流式每个 chunk 触发 `useChat` 的 `messages` 变更 → `MessageList` 重渲染 → **所有** `MessageItem` 重渲染 → **所有** `MarkdownContent` 重新跑 `ReactMarkdown` + `remarkGfm` + `rehypeHighlight`（代码高亮极耗 CPU）→ 页面卡死。

**修复（3 处）：**

1. **`MessageItem` 包 `React.memo`** — content 没变的消息跳过重渲染
   ```ts
   function MessageItemImpl({...}) {...}
   export const MessageItem = memo(MessageItemImpl);
   ```

2. **`MarkdownContent` 包 `memo`** — 相同 content 不重复解析 markdown
   ```ts
   export const MarkdownContent = memo(function MarkdownContent({ content }) {...});
   ```

3. **`onRegenerate` prop 稳定化** — 不再条件切换（`!isStreaming ? fn : undefined` 会让 streaming 状态切换时所有消息 memo 失效），改为始终传稳定引用 + 把 `isStreaming` 作为独立 prop 传入，`MessageItem` 内部判断是否显示重新生成按钮

**效果：** 流式时只有最后一条正在变化的 assistant 消息重渲染，其余消息被 memo 跳过。

### 10.3 滚动行为

`MessageList` 的滚动逻辑：
- **消息条数变化**（新消息加入）：双 rAF 强制滚到底（等异步布局完成）
- **流式 token 增长**：仅在用户当前已在底部附近（80px 阈值）时跟随
- **ResizeObserver**：内容高度变化（代码高亮、图片加载）时，若用户在底部则保持
- **初始挂载跳过**：`isMountedRef` 避免页面进入时跳动

### 10.4 ModelPicker

- 匿名用户只显示免费模型（`ChatShell` 过滤 `selectableModels`）
- 登录用户显示全部已配置模型
- `canSwitchModel` 始终为 true（匿名也能切免费模型）

---

## 11. Markdown 渲染与复制体验

### 11.1 Markdown 规整

`MarkdownContent` 的 `normalizeMarkdown()` 在渲染前规整原文：
- `\r\n` → `\n`
- 连续 3+ 换行折叠为 2 个（单个段落 break）
- 去首尾空白

**prose 样式收紧：** `prose-p:my-1 prose-p:first:mt-0 prose-p:last:mb-0` 等，避免 chat 气泡里段落间距过大。

### 11.2 代码块

`CodeBlock` 组件：
- 识别 `className` 含 `language-` 为块代码
- 显示语言标签 + 复制按钮
- `extractText` 递归提取代码文本
- 行内代码用 `<code>` + 背景色

### 11.3 复制体验（双击选中 Ctrl+C）

**问题：** 浏览器原生复制会把 `<p>` 块边界 + margin 转成换行，导致复制结果带 3+ 连续空行。

**修复（`MessageItem.tsx`）：**

1. **`onCopy` 事件拦截** — 在气泡 div 上拦截原生 copy 事件，清洗选中文本：
   ```ts
   const handleNativeCopy = (e) => {
     const text = window.getSelection().toString();
     const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "");
     if (cleaned !== text) {
       e.preventDefault();
       e.clipboardData?.setData("text/plain", cleaned);
     }
   };
   ```

2. **复制按钮** — 用规整后的 `copyText`（用户消息 trim，AI 消息折叠空行）

3. **用户消息渲染** — `whitespace-pre-wrap` + `break-words` + 空行折叠

---

## 12. System Prompt 与角色设定

### 12.1 默认 System Prompt

`route.ts:14` 的 `DEFAULT_SYSTEM_PROMPT`，硬编码顾砚雪角色设定，作为所有对话的默认 system prompt（匿名 + 无自定义 systemPrompt 的登录用户）。

**不使用 `ai-skills.json`**：该文件存在但当前未接入路由（skill 选择器未做 UI）。顾砚雪提示词直接作为默认 system prompt，不供用户选择。

### 12.2 自定义 System Prompt

登录用户的 `chat_conversations.system_prompt` 不为 null 时覆盖默认。当前 UI 未提供编辑入口，可通过 DB 直接修改。

### 12.3 摘要注入

触发摘要时，摘要内容拼在 system prompt 末尾（见 §7.7），不进 messages 数组。

---

## 13. 日志体系

### 13.1 日志分类

所有日志统一 `[chat]` 或 `[memory]` 前缀，便于终端过滤。

| 日志 | 位置 | 内容 |
|------|------|------|
| `[chat] input:` | route.ts:252 | 用户类型、conversationId、请求/解析/候选模型、minContextWindow、消息数、最后一条用户消息预览 |
| `[chat] memory:` | route.ts:272 | summarized 标志、裁剪前后消息数、system 长度、是否含摘要段 |
| `[chat] trying model:` | route.ts:295 | 当前尝试的候选模型 |
| `[chat] output:` | route.ts:306 (onFinish) | 实际用哪个模型、finishReason、输出字符数、输出预览 120 字、usage 的 input/output/total tokens |
| `[chat] streaming from model:` | route.ts:366 | 最终选定开始流式的模型 |
| `[chat] streamText error:` | route.ts:302 | streamText 错误 |
| `[chat] stream error:` | route.ts:339 | SSE 流错误 |
| `[chat] all candidate models failed:` | route.ts:388 | 所有候选失败 + attemptLog |
| `[chat] redis daily count failed, fallback to in-memory:` | route.ts:131 | Upstash 日限计数失败，降级进程内 |
| `[memory] check:` | memory.ts:221 | 消息数、estTokens、contextWindow、threshold、willSummarize、conversationId、redisAvailable |
| `[memory] summarized:` | memory.ts:290 | 摘要了多少条、摘要长度、保留多少条、token 对比 |
| `[memory] sliding-window only:` | memory.ts:243 | 匿名用户滑窗丢弃了多少条 |
| `[memory] summary unavailable, fallback` | memory.ts:282 | 摘要失败降级 |
| `[ai] createOpenAI:` | index.ts:52 | OpenAI provider 创建（baseURL/modelId/api/apiKeyMasked） |

### 13.2 验证 Upstash 连接

`[memory] check:` 的 `redisAvailable: true` = Upstash 连接正常。`willSummarize: false` = 消息量未到阈值。

### 13.3 验证摘要触发

`[memory] summarized:` 出现 = 摘要成功 + Upstash 写入成功。可在 Upstash 控制台 `KEYS chat:summary:*` 确认。

---

## 14. 环境变量

### 14.1 必需

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（RLS 读） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role（绕 RLS，写 + draft 读） |

### 14.2 AI 模型（按需配置，至少一个免费模型）

| 变量 | 对应模型 |
|------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 系列 |
| `OPENAI_API_KEY` + `OPENAI_BASE_URL` | GPT 系列 |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_BASE_URL` | Claude 系列 |
| `DEEPSEEK_API_KEY` + `DEEPSEEK_BASE_URL` | DeepSeek |
| `ZHIPU_API_KEY` + `ZHIPU_BASE_URL` | GLM |
| `OEPNCODE_API_KEY` + `OPENCODE_BASE_URL` | opencode DeepSeek |

### 14.3 可选（短期记忆摘要缓存 + 匿名用户每日限流）

| 变量 | 用途 |
|------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL，未配置时短期记忆降级为纯滑窗、日限降级为进程内计数 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

> Upstash Redis 同时服务于：短期记忆摘要缓存（`chat:summary:*`）和匿名用户每日请求计数（`chat:daily:*`）。共用同一实例，无需额外配置。

### 14.4 已废弃

| 变量 | 说明 |
|------|------|
| `ADMIN_SECRET` | vestigial，`verifyAdminSecret()` 无引用，/admin 纯靠 Supabase session |

---

## 15. 后续规划

### 15.1 长期记忆（Pinecone）— 计划中

- 新建 `src/lib/services/ai/long-term-memory.ts`
- 用 Pinecone 存消息 embedding
- 请求前检索 top-k 相似历史，注入 system / 上下文
- 需要额外配 embedding 模型 + Pinecone env

### 15.2 每分钟速率限制（已移除）

早期有每 IP 60 次/分钟的进程内速率限制，已移除，避免与日限（30 次/天）重复防护。日限更严格且已用 Upstash 分布式计数。如未来需要防瞬时刷量，可加回基于 Redis 的每分钟限流（`INCR` + 60s TTL）。

### 15.3 Skill 选择器 UI

`ai-skills.json` 和 `src/lib/services/ai/skills.ts` 基础设施已就绪，但未接入路由和 UI。需要：
1. DB `chat_conversations` 加 `skill_id` 列
2. route.ts 用 skillId 查 skills.ts 取 systemPrompt
3. UI 加 skill 选择器

### 15.4 自定义 System Prompt 编辑 UI

当前 `chat_conversations.system_prompt` 只能通过 DB 修改，未提供用户编辑入口。

### 15.5 消息分页

`getMessages` 已支持 `before` 游标分页，但 `getMessagesAction` 当前一次取 100 条。超长对话可接入无限滚动。

---

## 附录：关键文件索引

| 文件 | 职责 |
|------|------|
| `src/app/api/chat/route.ts` | API 路由：鉴权、速率限制、模型 fallback、短期记忆、流式响应 |
| `src/lib/services/ai/index.ts` | Provider 解析与缓存、`getModel` |
| `src/lib/services/ai/models.ts` | 模型注册表读取、env 解析 |
| `src/lib/services/ai/types.ts` | `ModelConfig`/`AIConfig` 类型定义 |
| `src/lib/services/ai/memory.ts` | 短期记忆：token 估算、摘要、Upstash 缓存 |
| `src/lib/upstash/client.ts` | Upstash Redis 单例 |
| `src/lib/api/chat.ts` | 数据抽象 seam |
| `src/lib/api/supabase/chat.ts` | Supabase 实现 |
| `src/app/actions/chat.ts` | Server Actions |
| `src/hooks/useChatState.ts` | 前端状态容器 |
| `src/components/chat/ChatShell.tsx` | 顶层布局 + 模型过滤 |
| `src/components/chat/ChatPanel.tsx` | 对话面板 + useChat + transport |
| `src/components/chat/ChatEmptyPanel.tsx` | 空状态 + 模型选择 |
| `src/components/chat/MessageList.tsx` | 消息列表 + 滚动 |
| `src/components/chat/MessageItem.tsx` | 消息气泡 (memo) + 复制 |
| `src/components/chat/MarkdownContent.tsx` | Markdown 渲染 (memo) |
| `src/components/chat/ModelPicker.tsx` | 模型选择器 |
| `src/proxy.ts` | Next.js middleware（session 刷新 + /admin 保护） |
| `src/lib/supabase/server-client.ts` | SSR Supabase client（读 cookie） |
| `src/lib/supabase/middleware.ts` | session 刷新逻辑 |
| `src/types/chat.ts` | TypeScript 类型定义 |
| `ai-models.json` | 模型注册表 |
| `supabase/schema-chat.sql` | DB schema |
| `ai-skills.json` | Skill 定义（预留，未接入） |
