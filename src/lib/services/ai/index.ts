import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { AIConfig } from "./types";
import {
  resolveModelConfig,
  getDefaultModelId,
  getAvailableModels,
  isModelConfigured,
} from "./models";

export type { AIConfig, ModelConfig, ModelRegistryEntry } from "./types";
export {
  getAvailableModels,
  getDefaultModelId,
  isModelConfigured,
} from "./models";

const providerCache = new Map<string, (model: string) => LanguageModel>();

function getProvider(config: AIConfig): LanguageModel {
  const cacheKey = `${config.provider}:${config.apiKey ?? ""}:${config.baseURL ?? ""}:${config.api ?? ""}`;

  const cached = providerCache.get(cacheKey);
  if (cached) {
    return cached(config.modelId);
  }

  let providerFn: (model: string) => LanguageModel;

  switch (config.provider) {
    case "google": {
      const provider = createGoogleGenerativeAI({
        apiKey: config.apiKey,
      });
      providerFn = provider;
      providerCache.set(cacheKey, provider);
      break;
    }
    case "anthropic": {
      const provider = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      providerFn = provider;
      providerCache.set(cacheKey, provider);
      break;
    }
    case "openai":
    default: {
      const provider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      // api 字段决定走哪条 API 路径：
      //   "chat"      → Chat Completions API（/chat/completions），第三方兼容端点必用
      //   "responses" → Responses API（/responses），OpenAI 官方默认（未设置时走这条）
      if (config.api === "chat") {
        providerFn = (id: string) => provider.chat(id);
      } else {
        providerFn = (id: string) => provider.responses(id);
      }
      providerCache.set(cacheKey, providerFn);
      break;
    }
  }

  return providerFn(config.modelId);
}

export function getModel(
  modelId?: string
): { model: LanguageModel; config: AIConfig } {
  const resolvedId = modelId ?? getDefaultModelId();
  const resolved = resolveModelConfig(resolvedId);

  if (!resolved) {
    throw new Error(
      `AI 模型 "${resolvedId}" 未配置。请在环境变量中设置对应的 API Key。` +
        ` 可用模型: ${getAvailableModels()
          .map((m) => m.id)
          .join(", ") || "无（请至少配置一个模型的 API Key）"}`
    );
  }

  const model = getProvider(resolved.config);
  return { model, config: resolved.config };
}

export function isConfigured(): boolean {
  return getAvailableModels().length > 0;
}

export function getConfiguredModelId(requestedId?: string): string {
  if (requestedId && isModelConfigured(requestedId)) {
    return requestedId;
  }
  return getDefaultModelId();
}
