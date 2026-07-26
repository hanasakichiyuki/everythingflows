import { afterEach, describe, expect, it } from "vitest";
import {
  findUnusedPostImageUrls,
  isR2PostImageUrl,
} from "./media";
import type { TiptapDocument } from "@/lib/editor/types";

const originalR2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

afterEach(() => {
  if (originalR2PublicBaseUrl === undefined) {
    delete process.env.R2_PUBLIC_BASE_URL;
  } else {
    process.env.R2_PUBLIC_BASE_URL = originalR2PublicBaseUrl;
  }
});

const oldDocument: TiptapDocument = {
  type: "doc",
  content: [
    { type: "image", attrs: { src: "https://example.com/keep.png" } },
    { type: "image", attrs: { src: "https://example.com/remove.png" } },
  ],
};

const newDocument: TiptapDocument = {
  type: "doc",
  content: [
    { type: "image", attrs: { src: "https://example.com/keep.png" } },
  ],
};

describe("R2 media", () => {
  it("accepts only the configured public domain and posts prefix", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com";

    expect(isR2PostImageUrl("https://media.example.com/posts/photo.webp")).toBe(true);
    expect(isR2PostImageUrl("https://media.example.com/other/photo.webp")).toBe(false);
    expect(isR2PostImageUrl("https://other.example.com/posts/photo.webp")).toBe(false);
    expect(
      isR2PostImageUrl(
        "https://project.supabase.co/storage/v1/object/public/post-images/photo.webp"
      )
    ).toBe(false);
  });

  it("diffs TipTap image nodes", () => {
    expect(
      findUnusedPostImageUrls(
        {
          body: "",
          contentJson: oldDocument,
          contentFormat: "tiptap",
        },
        {
          body: "",
          contentJson: newDocument,
          contentFormat: "tiptap",
        }
      )
    ).toEqual(["https://example.com/remove.png"]);
  });

  it("preserves an image when converting legacy HTML to TipTap", () => {
    expect(
      findUnusedPostImageUrls(
        {
          body: '<p><img src="https://example.com/keep.png"></p>',
          contentFormat: "html",
        },
        {
          body: "",
          contentJson: newDocument,
          contentFormat: "tiptap",
        }
      )
    ).toEqual([]);
  });
});
