import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SupportedImageContentType } from "@/lib/image-validation";
import {
  extractPostImageUrls,
  findUnusedPostImageUrls,
  type StoredPostContent,
} from "@/lib/post-image-content";
import {
  getPostImageKey,
  isR2PostImageUrl,
  MediaConfigurationError,
  normalizePublicBaseUrl,
  R2_POST_IMAGE_PREFIX,
} from "@/lib/r2-post-image-url";

/**
 * 本模块只保留真正需要 AWS SDK 的 R2 操作（上传／删除）。
 * 纯 URL 判定已迁到 `lib/r2-post-image-url.ts`，纯内容解析已迁到
 * `lib/post-image-content.ts`；这里把它们同名转发一次，调用方无需改动，
 * 同时避免公开文章页被迫把 S3 客户端拉进服务端渲染的依赖图。
 */
export { isR2PostImageUrl, MediaConfigurationError };
export {
  extractPostImageUrls,
  findUnusedPostImageUrls,
  type StoredPostContent,
};

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

type R2MediaConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: URL;
};

function getR2Config(): R2MediaConfig {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new MediaConfigurationError(
      "R2 media is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL."
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: normalizePublicBaseUrl(publicBaseUrl),
  };
}

function createR2Client(config: R2MediaConfig): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

let cachedR2Client: S3Client | null = null;
let cachedR2ClientKey = "";

/**
 * 复用 S3 客户端。
 *
 * `getR2Config()` 每次调用都返回新对象，所以这里按"配置内容"缓存而不是按引用比较。
 * 一次插图会连着签发/执行多次请求（展示图 + 原图、多张图片），复用同一个客户端可以
 * 省掉重复的凭据解析与连接池初始化。
 */
function getR2Client(config: R2MediaConfig): S3Client {
  const key = [
    config.accountId,
    config.accessKeyId,
    config.secretAccessKey,
    config.bucket,
  ].join("\u0000");

  if (cachedR2Client && cachedR2ClientKey === key) return cachedR2Client;

  cachedR2Client = createR2Client(config);
  cachedR2ClientKey = key;
  return cachedR2Client;
}

function getImageExtension(contentType: string): string {
  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  if (!extension) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }
  return extension;
}

function createPostImageKey(contentType: string): string {
  return `${R2_POST_IMAGE_PREFIX}${Date.now()}-${randomUUID()}.${getImageExtension(contentType)}`;
}

export async function uploadPostImage(
  file: Buffer,
  _filename: string,
  contentType: string
): Promise<string> {
  const config = getR2Config();
  const key = createPostImageKey(contentType);
  const client = getR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return new URL(key, config.publicBaseUrl).toString();
}

/** 浏览器直传 R2 的签发结果。 */
export type PostImageUploadTicket = {
  /** 对象键（决定公开 URL，也决定 `deletePostImages` 能否回收它）。 */
  key: string;
  /** 带签名的 PUT 地址，5 分钟内有效。 */
  uploadUrl: string;
  /** 上传完成后的公开访问地址，直接写进正文的 image 节点。 */
  publicUrl: string;
};

const PRESIGN_EXPIRES_IN_SECONDS = 300;

/**
 * 只接受本站生成的展示图 key。
 *
 * `variant: "original"` 需要客户端回传展示图的 key 才能派生出成对的兄弟 key；若不校验，
 * 登录作者就能借签名往桶里任意 key 写文件。这里限定为 `posts/` 下、只含常见字符的键。
 */
const DISPLAY_KEY_PATTERN = /^posts\/[A-Za-z0-9._-]+$/;

/**
 * 展示图 key 是否为本站生成的形态。
 *
 * 供签发路由在鉴权后先做一次显式校验、把"非法 key"作为 400 返回；
 * `deriveOriginalKey` 内部还会再拦一次作为兜底。
 */
export function isValidDisplayImageKey(value: string): boolean {
  return DISPLAY_KEY_PATTERN.test(value);
}

/** `posts/123-abc.webp` + `jpg` → `posts/123-abc.orig.jpg`。 */
function deriveOriginalKey(displayKey: string, extension: string): string {
  if (!DISPLAY_KEY_PATTERN.test(displayKey)) {
    throw new Error("Invalid display key");
  }
  return `${displayKey.replace(/\.[a-z0-9]+$/i, "")}.orig.${extension}`;
}

/**
 * 签发浏览器直传用的 PUT 地址。
 *
 * 走直传而不是服务端中转，是为了绕开 Serverless 的请求体上限（图片动辄几 MB）。
 * 代价是放弃了服务端的魔数嗅探，改由客户端承担字节级校验：上传前先用
 * `detectImageContentType` 验头 + `createImageBitmap` 真解码（见 `image-compress.ts`）。
 *
 * 注意这里**只把 `Content-Type` 纳入签名**：签名覆盖的请求头浏览器必须原样发送，
 * 而桶上的 CORS 只放行了 `content-type`。因此不给对象写 `CacheControl` —— 缓存头由
 * 同源代理 `/api/post-image` 下发。若日后想让对象自身也带 immutable 缓存，需要先在
 * R2 的 CORS `AllowedHeaders` 里加上 `cache-control`，再在下面的命令里补上。
 */
export async function createPostImageUploadTicket(input: {
  contentType: SupportedImageContentType;
  variant: "display" | "original";
  /** `variant: "original"` 时必填：原图 key 由展示图 key 派生。 */
  displayKey?: string;
}): Promise<PostImageUploadTicket> {
  const config = getR2Config();
  const extension = getImageExtension(input.contentType);

  let key: string;
  if (input.variant === "original") {
    if (!input.displayKey) throw new Error("Missing display key");
    key = deriveOriginalKey(input.displayKey, extension);
  } else {
    key = createPostImageKey(input.contentType);
  }

  const uploadUrl = await getSignedUrl(
    getR2Client(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: PRESIGN_EXPIRES_IN_SECONDS }
  );

  return {
    key,
    uploadUrl,
    publicUrl: new URL(key, config.publicBaseUrl).toString(),
  };
}

export async function deletePostImage(url: string): Promise<void> {
  await deletePostImages([url]);
}

/** Deletes only URLs created by this site's configured R2 public domain. */
export async function deletePostImages(urls: string[]): Promise<void> {
  const keys = [...new Set(urls.map(getPostImageKey).filter((key): key is string => key !== null))];
  if (keys.length === 0) return;

  try {
    const config = getR2Config();
    const result = await getR2Client(config).send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      })
    );
    if (result.Errors?.length) {
      console.warn("Failed to delete some R2 images", result.Errors);
    }
  } catch (error) {
    // Image cleanup must not make a successful post/fragment change fail.
    console.warn("Failed to delete R2 images", error);
  }
}

export async function cleanupUnusedPostImages(
  oldContent: StoredPostContent,
  newContent: StoredPostContent
): Promise<void> {
  const toDelete = findUnusedPostImageUrls(oldContent, newContent);
  if (toDelete.length > 0) {
    await deletePostImages(toDelete);
  }
}
