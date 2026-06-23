import { Redis } from "@upstash/redis";

let client: Redis | null = null;
let initialized = false;

/**
 * Upstash Redis 单例（REST 模式，兼容 serverless / Edge）。
 * 未配置 env 时返回 null，调用方应据此降级（如短期记忆退化为纯滑窗截断）。
 *
 * 所需环境变量（见 .env.example）：
 *   UPSTASH_REDIS_REST_URL     — 类似 https://xxx-xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN   — Upstash 控制台生成的只读/读写 token
 */
export function getRedis(): Redis | null {
  if (initialized) return client;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  client = new Redis({ url, token });
  return client;
}
