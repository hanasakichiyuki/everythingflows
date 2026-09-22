import type { NextRequest } from "next/server";
import { normalizeSupportedImageContentType } from "@/lib/image-validation";
import { isManagedPostImageUrl } from "@/lib/post-image-proxy";

export const runtime = "nodejs";

/**
 * 代理上限，与编辑器允许保留的原图上限保持一致。
 *
 * 读者看到的是压缩后的展示图，只有点开"查看原图"才会请求到这个尺寸的对象；
 * 该路由是流式转发（不把整张图读进内存），所以放宽到 30MB 不会带来内存压力。
 */
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

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
