/**
 * R2 文章图片的 URL 判定工具。
 *
 * 刻意保持零依赖（不引入 `@aws-sdk/client-s3`、jsdom 等重量级模块）：公开文章页
 * 在服务端渲染时只需要做一次「这个 URL 是不是本站 R2 图片」的前缀白名单判断，
 * 不应该把整个 S3 客户端拖进页面渲染的函数依赖图里。
 *
 * 真正需要 AWS SDK 的上传／删除操作留在 `lib/api/media.ts`。
 * 注意：`R2_PUBLIC_BASE_URL` 仍然是本模块读取的唯一环境变量。
 */

export const R2_POST_IMAGE_PREFIX = "posts/";

export class MediaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaConfigurationError";
  }
}

export function normalizePublicBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MediaConfigurationError("R2_PUBLIC_BASE_URL must be a valid URL");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new MediaConfigurationError(
      "R2_PUBLIC_BASE_URL must be an HTTPS URL without credentials"
    );
  }

  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

function getConfiguredPublicBaseUrl(): URL | null {
  const value = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!value) return null;

  try {
    return normalizePublicBaseUrl(value);
  } catch {
    return null;
  }
}

/** 把 R2 公开 URL 还原成对象键；非本站 R2 图片返回 null。 */
export function getPostImageKey(url: string): string | null {
  const publicBaseUrl = getConfiguredPublicBaseUrl();
  if (!publicBaseUrl) return null;

  try {
    const source = new URL(url);
    if (
      source.protocol !== "https:" ||
      source.origin !== publicBaseUrl.origin ||
      !source.pathname.startsWith(publicBaseUrl.pathname)
    ) {
      return null;
    }

    const key = source.pathname.slice(publicBaseUrl.pathname.length);
    return key.startsWith(R2_POST_IMAGE_PREFIX) ? key : null;
  } catch {
    return null;
  }
}

export function isR2PostImageUrl(url: string): boolean {
  return getPostImageKey(url) !== null;
}
