import { getDataProvider } from "@/lib/api/provider";

export async function GET() {
  return Response.json({
    ok: true,
    provider: getDataProvider(),
    timestamp: new Date().toISOString(),
  });
}
