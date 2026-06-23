import modelsConfigJson from "../../../../ai-models.json";
import type {
  ModelConfig,
  ModelRegistryEntry,
  AIConfig,
} from "./types";

const MODELS: ModelConfig[] = (modelsConfigJson as { models: ModelConfig[] }).models;

/** 按 model 声明的 apiKeyEnv 读取对应环境变量 */
function getApiKeyForModel(model: ModelConfig): string | undefined {
  return process.env[model.apiKeyEnv] || undefined;
}

/** 按 model 声明的 baseUrlEnv 读取对应环境变量（未声明则返回 undefined） */
function getBaseURLForModel(model: ModelConfig): string | undefined {
  if (!model.baseUrlEnv) return undefined;
  return process.env[model.baseUrlEnv] || undefined;
}

export function getAllModels(): ModelRegistryEntry[] {
  return MODELS.map((m) => ({
    ...m,
    configured: Boolean(getApiKeyForModel(m)),
  }));
}

export function getAvailableModels(): ModelRegistryEntry[] {
  return getAllModels().filter((m) => m.configured);
}

export function getModelById(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getDefaultModelId(): string {
  const available = getAvailableModels();
  const freeModel = available.find((m) => m.isFree);
  if (freeModel) return freeModel.id;
  if (available.length > 0) return available[0].id;
  return MODELS[0]?.id ?? "glm-4.7-flash";
}

export function isModelConfigured(id: string): boolean {
  const model = getModelById(id);
  if (!model) return false;
  return Boolean(getApiKeyForModel(model));
}

export function resolveModelConfig(id: string): {
  config: AIConfig;
  model: ModelConfig;
} | null {
  const model = getModelById(id);
  if (!model) return null;

  const apiKey = getApiKeyForModel(model);
  if (!apiKey) return null;

  const baseURL = getBaseURLForModel(model);

  return {
    model,
    config: {
      modelId: model.modelId,
      provider: model.provider,
      apiKey,
      baseURL,
      maxOutputTokens: model.maxOutputTokens,
      contextWindow: model.contextWindow,
      api: model.api,
    },
  };
}
