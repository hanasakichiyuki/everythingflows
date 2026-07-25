import { generateText, type LanguageModel } from "ai";
import { getRedis } from "@/lib/upstash/client";
import { getAvailableModels, getModel } from "./index";

/**
 * 短期记忆管理：滑动窗口 + 滚动摘要。
 *
 * 策略：
 *   - 估算全部历史消息的 token 数；
 *   - 若超过 contextWindow × 60%（保守阈值），触发摘要：
 *       保留最近 `RECENT_KEEP` 条原文不动；
 *       更早的消息与缓存摘要做增量合并，写回 Upstash；
 *       摘要拼进 system prompt，原文从 messages 中丢弃。
 *   - 未达阈值 → 原样发送，不做任何处理。
 *   - 匿名用户无 conversationId → 不缓存，超限时直接丢最早消息（纯滑窗）。
 *   - Upstash 未配置 / 摘要模型不可用 → 降级为纯滑窗，不报错。
 */

/** recent window：保留最近多少条原文不参与摘要 */
const RECENT_KEEP = 8;
/** 触发摘要的阈值占 contextWindow 的比例 */
const SUMMARY_THRESHOLD_RATIO = 0.6;
/** Upstash 键前缀 */
const SUMMARY_KEY_PREFIX = "chat:summary:";
/** 摘要缓存 TTL：7 天 */
const SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60;
/** 摘要输出 token 上限（控制成本） */
const SUMMARY_MAX_TOKENS = 512;
/** contextWindow 未配置时的兜底值 */
const DEFAULT_CONTEXT_WINDOW = 32768;

export interface ChatMessageLite {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface CachedSummary {
  text: string;
  /** 摘要已覆盖的消息条数（从消息数组开头算） */
  count: number;
}

/**
 * 启发式 token 估算（AI SDK v6 无内置 countTokens）。
 *   - CJK 字符 ≈ 1.5 token/字
 *   - ASCII 字符 ≈ 1 token / 4 字符
 *   - 每条消息固定开销 10 token（角色标记等）
 * 估算偏高以保留安全余量。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let cjk = 0;
  let ascii = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (isCJK(code)) {
      cjk += 1;
    } else {
      ascii += 1;
    }
  }
  return Math.ceil(cjk * 1.5 + ascii / 4);
}

/**
 * 判断码点是否属于 CJK 系列（含扩展区）。
 * `for...of` 已按码点遍历，代理对不会拆分；此处只需补全码点范围。
 */
function isCJK(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||  // Hangul Jamo
    (code >= 0x2e80 && code <= 0x2eff) ||  // CJK Radicals Supplement
    (code >= 0x3000 && code <= 0x303f) ||  // CJK Symbols and Punctuation
    (code >= 0x3040 && code <= 0x30ff) ||  // Hiragana / Katakana
    (code >= 0x3100 && code <= 0x312f) ||  // Bopomofo
    (code >= 0x3130 && code <= 0x318f) ||  // Hangul Compatibility Jamo
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Unified Ideographs Extension A
    (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified Ideographs (基本块)
    (code >= 0xa000 && code <= 0xa4cf) ||  // Yi
    (code >= 0xac00 && code <= 0xd7af) ||  // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compatibility Ideographs
    (code >= 0xfe30 && code <= 0xfe4f) ||  // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xffef) ||  // Fullwidth Forms
    (code >= 0x20000 && code <= 0x2ffff) || // CJK Unified Ideographs Extension B-F
    (code >= 0x30000 && code <= 0x3ffff)    // CJK Unified Ideographs Extension G+
  );
}

export function estimateMessagesTokens(messages: ChatMessageLite[]): number {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content) + 10;
  }
  return total;
}

/** 取第一个已配置的免费模型作为摘要器；不可用时返回 null */
function getSummarizerModel(): LanguageModel | null {
  const free = getAvailableModels().find((m) => m.isFree);
  if (!free) return null;
  try {
    return getModel(free.id).model;
  } catch {
    return null;
  }
}

const SUMMARIZER_SYSTEM =
  "你是对话摘要助手。把给定对话历史压缩成简洁的中文摘要，" +
  "保留关键事实、用户偏好、未完成的话题与重要结论。不要编造，不要寒暄，" +
  "用一段连贯的话直接输出摘要内容。";

/** 把消息列表格式化为摘要器可读的纯文本 */
function formatMessagesForSummary(messages: ChatMessageLite[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`)
    .join("\n\n");
}

/**
 * 生成（或增量更新）摘要。
 * - 无缓存摘要：对 newMessages 做完整摘要。
 * - 有缓存摘要：把已有摘要 + 追加消息一起送入，让模型输出覆盖后的完整摘要。
 * 失败时返回 null（调用方降级）。
 */
async function summarizeMessages(
  existing: CachedSummary | null,
  newMessages: ChatMessageLite[]
): Promise<string | null> {
  if (newMessages.length === 0) return existing?.text ?? null;

  const model = getSummarizerModel();
  if (!model) return null;

  const formattedNew = formatMessagesForSummary(newMessages);

  const prompt = existing
    ? `已有摘要（请在此基础上更新，覆盖之前的内容）：\n${existing.text}\n\n` +
      `新追加的对话：\n${formattedNew}\n\n` +
      `请输出更新后的完整摘要。`
    : `对话历史：\n${formattedNew}\n\n请输出摘要。`;

  try {
    const result = await generateText({
      model,
      system: SUMMARIZER_SYSTEM,
      prompt,
      maxOutputTokens: SUMMARY_MAX_TOKENS,
    });
    return result.text.trim() || null;
  } catch (e) {
    console.error("[memory] summarize failed:", e);
    return null;
  }
}

async function getCachedSummary(
  conversationId: string
): Promise<CachedSummary | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<CachedSummary>(SUMMARY_KEY_PREFIX + conversationId);
    if (raw && typeof raw === "object" && typeof raw.text === "string") {
      return raw;
    }
  } catch (e) {
    console.error("[memory] redis get failed:", e);
  }
  return null;
}

async function setCachedSummary(
  conversationId: string,
  summary: CachedSummary
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(
      SUMMARY_KEY_PREFIX + conversationId,
      summary,
      { ex: SUMMARY_TTL_SECONDS }
    );
  } catch (e) {
    console.error("[memory] redis set failed:", e);
  }
}

export interface MemoryContext {
  /** 最终传给 streamText 的 messages（已裁剪） */
  messages: ChatMessageLite[];
  /** 最终传给 streamText 的 system prompt（可能含摘要段） */
  system: string;
  /** 是否触发了摘要（用于日志） */
  summarized: boolean;
}

/**
 * 短期记忆主入口：根据 token 估算决定是否摘要，返回裁剪后的 messages + system。
 *
 * @param allMessages   客户端传来的完整历史（user/assistant，已剔除 system）
 * @param contextWindow 当前模型的输入 token 上限
 * @param baseSystem    基础 system prompt（角色设定）
 * @param conversationId 对话 id；匿名用户传 undefined（不缓存摘要）
 */
export async function buildContextWithMemory(
  allMessages: ChatMessageLite[],
  contextWindow: number | undefined,
  baseSystem: string,
  conversationId: string | undefined
): Promise<MemoryContext> {
  const window = contextWindow && contextWindow > 0
    ? contextWindow
    : DEFAULT_CONTEXT_WINDOW;
  const threshold = Math.floor(window * SUMMARY_THRESHOLD_RATIO);

  const totalTokens = estimateMessagesTokens(allMessages);

  // 未达阈值：原样发送
  if (totalTokens <= threshold) {
    return { messages: allMessages, system: baseSystem, summarized: false };
  }

  // 达到阈值：切分 recent window 与 toSummarize
  const splitIdx = Math.max(0, allMessages.length - RECENT_KEEP);
  const toSummarize = allMessages.slice(0, splitIdx);
  const recent = allMessages.slice(splitIdx);

  // 匿名用户 / 无 conversationId：纯滑窗，丢弃 toSummarize
  if (!conversationId) {
    return { messages: recent, system: baseSystem, summarized: true };
  }

  // 登录用户：尝试增量摘要
  const cached = await getCachedSummary(conversationId);

  // 计算需要新摘要的消息：从缓存覆盖点之后到 toSummarize 末尾
  let newToSummarize: ChatMessageLite[];
  if (cached && cached.count > 0 && cached.count <= toSummarize.length) {
    newToSummarize = toSummarize.slice(cached.count);
  } else {
    // 缓存失效（count 越界）或无缓存：完整摘要
    newToSummarize = toSummarize;
  }

  let summaryText: string | null = cached?.text ?? null;

  if (newToSummarize.length > 0) {
    const updated = await summarizeMessages(
      cached && cached.count > 0 && cached.count <= toSummarize.length
        ? cached
        : null,
      newToSummarize
    );
    if (updated) {
      summaryText = updated;
      await setCachedSummary(conversationId, {
        text: updated,
        count: toSummarize.length,
      });
    }
  }

  // 摘要不可用（无免费模型 / 调用失败）：降级纯滑窗
  if (!summaryText) {
    return { messages: recent, system: baseSystem, summarized: true };
  }

  const system = `${baseSystem}\n\n---\n以下为之前对话的摘要，供你延续上下文：\n${summaryText}`;
  return { messages: recent, system, summarized: true };
}
