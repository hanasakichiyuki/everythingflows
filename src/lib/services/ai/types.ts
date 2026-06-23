export type AIProviderType = "google" | "openai" | "anthropic";

/**
 * OpenAI provider 的 API 路径选择：
 * - "responses"（默认）：走 Responses API（/responses），OpenAI 官方端点支持
 * - "chat"：走 Chat Completions API（/chat/completions），第三方兼容端点必用
 */
export type OpenAIApiMode = "responses" | "chat";

export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProviderType;
  modelId: string;
  isFree: boolean;
  description: string;
  maxOutputTokens?: number;
  /** 输入上下文窗口大小（token 上限）。用于短期记忆裁剪决策，未配置时按 32768 兜底。 */
  contextWindow?: number;
  /** 读取 API Key 的环境变量名（每个模型独立指定，实现多 provider 并存） */
  apiKeyEnv: string;
  /** 读取 Base URL 的环境变量名（可选，OpenAI 兼容端点用） */
  baseUrlEnv?: string;
  /** 仅 provider="openai" 生效。默认 "responses"（OpenAI 官方），第三方兼容端点需设为 "chat" */
  api?: OpenAIApiMode;
}

export interface AIConfig {
  modelId: string;
  provider: AIProviderType;
  apiKey: string;
  baseURL?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
  api?: OpenAIApiMode;
}

export interface ModelRegistryEntry extends ModelConfig {
  configured: boolean;
}
