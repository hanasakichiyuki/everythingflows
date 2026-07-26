export const SUPPORTED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type SupportedImageContentType =
  (typeof SUPPORTED_IMAGE_CONTENT_TYPES)[number];

const supportedImageContentTypes = new Set<string>(
  SUPPORTED_IMAGE_CONTENT_TYPES
);

/** Returns a supported MIME type after removing optional response parameters. */
export function normalizeSupportedImageContentType(
  value: string | null | undefined
): SupportedImageContentType | null {
  const contentType = value?.split(";", 1)[0]?.trim().toLowerCase();
  return contentType && supportedImageContentTypes.has(contentType)
    ? (contentType as SupportedImageContentType)
    : null;
}

/**
 * Identifies supported image formats from their bytes instead of trusting the
 * browser-provided MIME type, which can be wrong after a download or paste.
 */
export function detectImageContentType(
  bytes: Uint8Array
): SupportedImageContentType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
