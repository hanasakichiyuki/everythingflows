import type { NextRequest } from "next/server";
import { normalizeSupportedImageContentType } from "@/lib/image-validation";
import { isManagedPostImageUrl } from "@/lib/post-image-proxy";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("src");
  if (!source || !isManagedPostImageUrl(source)) {
    return Response.json({ error: "图片地址无效" }, { status: 400 });
  }

  try {
    const upstream = await fetch(source, { cache: "force-cache" });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: "图片暂时不可用" }, { status: 502 });
    }

    const contentType = normalizeSupportedImageContentType(
      upstream.headers.get("content-type")
    );
    if (!contentType) {
      return Response.json({ error: "图片格式无效" }, { status: 415 });
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      return Response.json({ error: "图片文件过大" }, { status: 413 });
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    });
    if (contentLength > 0) headers.set("Content-Length", String(contentLength));

    return new Response(upstream.body, { headers });
  } catch (error) {
    console.error("[post-image] failed to load image", error);
    return Response.json({ error: "图片暂时不可用" }, { status: 502 });
  }
}
