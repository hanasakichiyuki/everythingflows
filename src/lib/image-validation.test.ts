import { describe, expect, it } from "vitest";
import {
  detectImageContentType,
  normalizeSupportedImageContentType,
} from "./image-validation";

describe("image content type detection", () => {
  it.each([
    ["JPEG", [0xff, 0xd8, 0xff], "image/jpeg"],
    ["PNG", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    ["GIF", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], "image/gif"],
    [
      "WebP",
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      "image/webp",
    ],
  ])("detects %s from bytes", (_name, bytes, contentType) => {
    expect(detectImageContentType(Uint8Array.from(bytes))).toBe(contentType);
  });

  it("rejects unknown bytes", () => {
    expect(detectImageContentType(Uint8Array.from([1, 2, 3, 4]))).toBeNull();
  });

  it("accepts a supported response MIME type with parameters", () => {
    expect(normalizeSupportedImageContentType("image/png; charset=binary")).toBe(
      "image/png"
    );
    expect(normalizeSupportedImageContentType("text/html")).toBeNull();
  });
});
