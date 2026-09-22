import {
  detectImageContentType,
  type SupportedImageContentType,
} from "@/lib/image-validation";

/**
 * 插图前的图片预处理（纯浏览器 API，不引入新依赖）。
 *
 * 目标：作者粘贴/拖入一张 3–4MB 的截图时，正文里先出现一张几百 KB 的展示图，
 * 不必等原图上传完成（原图由 `upload.ts` 在后台补传）。
 */

/** 展示图最长边。超过则等比缩放 —— 正文容器的显示宽度远小于此，再大只是白费流量。 */
export const DISPLAY_MAX_EDGE = 2000;

/** WebP 编码质量。0.85 在截图/照片上基本看不出差别，体积通常只有原图的 1/5 – 1/10。 */
export const DISPLAY_QUALITY = 0.85;

/**
 * 压缩收益低于该比例时不再单独保留原图。
 *
 * 两份几乎一样大的文件只会白占存储，还让作者多等一次上传；此时直接用压缩结果作为
 * 唯一副本（等于"没有原图"），正文表现完全一样。
 */
export const MIN_SAVINGS = 0.2;

export type PreparedEditorImage = {
  /** 用于上传展示图的数据（无压缩收益时就是原文件）。 */
  display: Blob;
  displayContentType: SupportedImageContentType;
  /** 需要单独补传的原图；null 表示这份内容只存一份。 */
  original: { blob: File; contentType: SupportedImageContentType } | null;
};

/** 嗅探所需的前导字节数：四种格式的魔数都在前 12 字节内。 */
const HEAD_BYTES = 32;

/**
 * 用魔数确认真实格式，而不是相信 `file.type`。
 *
 * 直传绕过了服务端的魔数校验（`/api/upload` 会做），所以这里补回来：下载后另存、
 * 或从其它应用粘贴过来的文件，`type` 可能是空的甚至错的，而 MIME 决定了对象在 R2 里
 * 的扩展名与 Content-Type，错了浏览器就渲染不出来。
 */
async function sniffContentType(
  file: File
): Promise<SupportedImageContentType | null> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  return detectImageContentType(head);
}

function scaleToMaxEdge(width: number, height: number, maxEdge: number) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxEdge) return { width, height };

  const ratio = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** 缩放到指定尺寸并编码为 WebP；任何一步不可用都返回 null（调用方退回原图）。 */
async function encodeWebp(
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<Blob | null> {
  // 优先用 OffscreenCanvas（不碰 DOM，主线程更省）；不可用时退回普通 canvas。
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/webp", quality: DISPLAY_QUALITY });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", DISPLAY_QUALITY);
  });
}

/**
 * 把用户选择的图片整理成"待上传的展示图 (+ 可选原图)"。
 *
 * 三种情况只存一份：GIF（canvas 只能取到第一帧，压缩会毁掉动图）、浏览器不支持
 * WebP 编码、以及压缩收益不足 `MIN_SAVINGS`。
 */
export async function prepareEditorImage(
  file: File
): Promise<PreparedEditorImage> {
  const contentType = await sniffContentType(file);
  if (!contentType) {
    throw new Error("图片格式无效（仅支持 PNG / JPEG / GIF / WebP）");
  }

  if (contentType === "image/gif") {
    return {
      display: file,
      displayContentType: contentType,
      original: null,
    };
  }

  // 浏览器不支持 createImageBitmap（老环境）时不做压缩，避免整个功能不可用。
  if (typeof createImageBitmap !== "function") {
    return {
      display: file,
      displayContentType: contentType,
      original: null,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // 魔数对得上但解不开，说明文件已损坏：宁可当场报错，也不要让一张显示不出来的
    // 图片进正文（直传没有服务端复核这一关）。
    throw new Error("图片无法解码，文件可能已损坏");
  }

  try {
    const size = scaleToMaxEdge(bitmap.width, bitmap.height, DISPLAY_MAX_EDGE);
    const compressed = await encodeWebp(bitmap, size.width, size.height);

    // `toBlob` 在不支持 WebP 编码的浏览器上会静默产出 PNG，`type` 是唯一的判据。
    const usable =
      compressed !== null &&
      compressed.type === "image/webp" &&
      compressed.size < file.size * (1 - MIN_SAVINGS);

    if (!usable) {
      return {
        display: file,
        displayContentType: contentType,
        original: null,
      };
    }

    return {
      display: compressed,
      displayContentType: "image/webp",
      original: { blob: file, contentType },
    };
  } finally {
    bitmap.close();
  }
}
