import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ContentFormat } from "@/types";
import type { TiptapDocument } from "@/lib/editor/types";
import { extractTiptapImageUrls } from "@/lib/editor/serialization";

const R2_POST_IMAGE_PREFIX = "posts/";

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

export class MediaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaConfigurationError";
  }
}

function normalizePublicBaseUrl(value: string): URL {
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

function getConfiguredPublicBaseUrl(): URL | null {
  const value = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!value) return null;

  try {
    return normalizePublicBaseUrl(value);
  } catch {
    return null;
  }
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

function getPostImageKey(url: string): string | null {
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

export function extractImageUrls(html: string): string[] {
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export type StoredPostContent = {
  body: string;
  contentJson?: TiptapDocument | null;
  contentFormat: ContentFormat;
};

export function extractPostImageUrls(content: StoredPostContent): string[] {
  if (content.contentFormat === "tiptap" && content.contentJson) {
    return extractTiptapImageUrls(content.contentJson);
  }
  if (content.contentFormat === "html") {
    return extractImageUrls(content.body);
  }
  return [];
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

export function findUnusedPostImageUrls(
  oldContent: StoredPostContent,
  newContent: StoredPostContent
): string[] {
  const oldUrls = extractPostImageUrls(oldContent);
  const newUrls = new Set(extractPostImageUrls(newContent));
  return oldUrls.filter((url) => !newUrls.has(url));
}
