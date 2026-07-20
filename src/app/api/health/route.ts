import { getDataProvider } from "@/lib/api/provider";
import { getSupabasePublic } from "@/lib/api/supabase/client";
import { getRedis } from "@/lib/upstash/client";
import { isConfigured } from "@/lib/services/ai";

export async function GET() {
  const checks = {
    supabase: false,
    redis: false,
    models: isConfigured(),
  };

  try {
    const { error } = await getSupabasePublic().from("posts").select("id").limit(1);
    checks.supabase = !error;
  } catch {}

  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping();
      checks.redis = true;
    } catch {}
  }

  const ok = checks.supabase && checks.models;
  return Response.json({
    ok,
    provider: getDataProvider(),
    timestamp: new Date().toISOString(),
    checks,
  }, { status: ok ? 200 : 503 });
}
