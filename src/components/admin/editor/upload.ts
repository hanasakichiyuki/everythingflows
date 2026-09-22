import type { SupportedImageContentType } from "@/lib/image-validation";
import { prepareEditorImage } from "./image-compress";

/**
 * 编辑器图片上传（浏览器 → R2 直传）。
 *
 * 分两阶段：先把压缩后的**展示图**传完、正文里立刻显示它；**原图**在后台补传，成功后
 * 由调用方把它的地址写进该图片节点的 `originalSrc`（读者点图可看原图）。
 *
 * 走直传而不是 `/api/upload` 中转，是为了绕开 Serverless 的请求体上限（原图可达 30MB）；
 * 代价是服务端不再嗅探字节，因此校验前移到 `prepareEditorImage`（魔数 + 真实解码）。
 * `/api/upload` 保留给留言墙等其它场景，此处不受影响。
 */

/** 原图体积上限；超过则只保留展示图，并在编辑器里提示作者。 */
export const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024;

export type UploadedEditorImage = {
  /** 展示图地址，直接作为正文 image 节点的 `src`。 */
  displayUrl: string;
  /**
   * 后台补传原图并返回其地址。
   *
   * `null` 表示这份内容只需一份图（GIF、压缩收益不足）。失败时抛错，由调用方决定
   * 提示方式 —— 原图缺失不影响正文可用。
   */
  uploadOriginal: (() => Promise<string>) | null;
  /** 主动放弃保留原图时的提示文案（目前仅"原图超限"），无需提示时为 null。 */
  originalNotice: string | null;
};

type PresignTicket = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

type PresignRequest = {
  contentType: SupportedImageContentType;
  variant: "display" | "original";
  displayKey?: string;
};

async function requestUploadTicket(
  input: PresignRequest
): Promise<PresignTicket> {
  const response = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  const result = (await response.json().catch(() => null)) as
    | (Partial<PresignTicket> & { error?: string })
    | null;

  if (!response.ok || !result?.uploadUrl || !result.key || !result.publicUrl) {
    throw new Error(result?.error ?? "无法获取上传地址，请稍后重试");
  }

  return {
    key: result.key,
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
  };
}

/**
 * 直传一个变体。
 *
 * `Content-Type` 必须与签发时的完全一致：它被纳入了签名，R2 会拒绝不匹配的请求头，
 * 同时它决定了对象的 MIME 与扩展名。
 */
async function putToR2(
  ticket: PresignTicket,
  body: Blob,
  contentType: SupportedImageContentType
): Promise<void> {
  const response = await fetch(ticket.uploadUrl, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`图片上传失败（${response.status}）`);
  }
}

export async function uploadEditorImage(
  file: File
): Promise<UploadedEditorImage> {
  const prepared = await prepareEditorImage(file);

  // 展示图是唯一必须成功的一份：它决定了正文里能不能看到图。
  if (prepared.display.size > MAX_ORIGINAL_BYTES) {
    throw new Error("图片过大（超过 30MB），请先压缩后再上传");
  }

  const displayTicket = await requestUploadTicket({
    contentType: prepared.displayContentType,
    variant: "display",
  });
  await putToR2(displayTicket, prepared.display, prepared.displayContentType);

  const original = prepared.original;
  const originalOversized =
    original !== null && original.blob.size > MAX_ORIGINAL_BYTES;

  return {
    displayUrl: displayTicket.publicUrl,
    originalNotice: originalOversized
      ? "原图超过 30MB，已只保留压缩后的展示图。"
      : null,
    uploadOriginal:
      original && !originalOversized
        ? async () => {
            const ticket = await requestUploadTicket({
              contentType: original.contentType,
              variant: "original",
              displayKey: displayTicket.key,
            });
            await putToR2(ticket, original.blob, original.contentType);
            return ticket.publicUrl;
          }
        : null,
  };
}
