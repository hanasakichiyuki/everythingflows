import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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
  const client = createR2Client(config);

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

export async function deletePostImage(url: string): Promise<void> {
  await deletePostImages([url]);
}

/** Deletes only URLs created by this site's configured R2 public domain. */
export async function deletePostImages(urls: string[]): Promise<void> {
  const keys = [...new Set(urls.map(getPostImageKey).filter((key): key is string => key !== null))];
  if (keys.length === 0) return;

  try {
    const config = getR2Config();
    const result = await createR2Client(config).send(
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
