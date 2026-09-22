import {
  createPostImageUploadTicket,
  isValidDisplayImageKey,
  MediaConfigurationError,
} from "@/lib/api/media";
import {
  SUPPORTED_IMAGE_CONTENT_TYPES,
  type SupportedImageContentType,
} from "@/lib/image-validation";
import { createClient } from "@/lib/supabase/server-client";

export const runtime = "nodejs";

type PresignRequestBody = {
  contentType?: unknown;
  variant?: unknown;
  displayKey?: unknown;
};

function isSupportedContentType(
  value: unknown
): value is SupportedImageContentType {
  return (
    typeof value === "string" &&
    (SUPPORTED_IMAGE_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

function isVariant(value: unknown): value is "display" | "original" {
  return value === "display" || value === "original";
}

/**
 * 签发图片直传地址。
 *
 * 与 `/api/upload` 的分工：那个接口接收文件本身（留言墙在用，5MB 上限，走服务端中转），
 * 这里只签发地址、不碰字节流，因此不受 Serverless 请求体上限约束。鉴权与上传路径与
 * `/api/upload` 保持一致：必须是已登录作者，且只能往 `posts/` 前缀写。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PresignRequestBody;
  try {
    body = (await request.json()) as PresignRequestBody;
  } catch {
    return Response.json({ error: "请求体格式无效" }, { status: 400 });
  }

  const { contentType, variant, displayKey } = body;
  if (!isSupportedContentType(contentType) || !isVariant(variant)) {
    return Response.json({ error: "参数无效" }, { status: 400 });
  }
  if (
    variant === "original" &&
    (typeof displayKey !== "string" || !isValidDisplayImageKey(displayKey))
  ) {
    return Response.json({ error: "展示图标识无效" }, { status: 400 });
  }

  try {
    const ticket = await createPostImageUploadTicket({
      contentType,
      variant,
      displayKey: typeof displayKey === "string" ? displayKey : undefined,
    });
    return Response.json(ticket);
  } catch (error) {
    console.error("[upload/presign] failed", error);
    if (error instanceof MediaConfigurationError) {
      return Response.json({ error: "R2 图片存储尚未完成配置" }, { status: 503 });
    }
    return Response.json({ error: "无法签发上传地址，请稍后重试" }, { status: 500 });
  }
}
