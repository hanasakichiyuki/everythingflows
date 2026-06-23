// 临时诊断脚本：检查 Upstash env 是否在 Next.js 运行时可见
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
console.log("UPSTASH_REDIS_REST_URL:", url ? `${url.slice(0, 30)}... (len ${url.length})` : "(missing)");
console.log("UPSTASH_REDIS_REST_TOKEN:", token ? `${token.slice(0, 6)}... (len ${token.length})` : "(missing)");
