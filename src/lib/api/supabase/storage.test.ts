import { describe, expect, it } from "vitest";
import { findUnusedPostImageUrls } from "./storage";
import type { TiptapDocument } from "@/lib/editor/types";

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

describe("post image cleanup", () => {
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
