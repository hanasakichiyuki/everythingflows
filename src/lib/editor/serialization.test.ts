import { describe, expect, it } from "vitest";
import { generateHTML } from "@tiptap/html";
import { serverEditorExtensions } from "./extensions";
import {
  extractTiptapImageUrls,
  extractTiptapText,
  htmlToTiptapDocument,
  plainTextToTiptapContent,
} from "./serialization";
import {
  isTiptapDocumentEmpty,
  type TiptapDocument,
  validateTiptapDocument,
} from "./types";

const document: TiptapDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "标题" }],
    },
    {
      type: "callout",
      attrs: { kind: "info" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "提示内容" }],
        },
      ],
    },
    {
      type: "image",
      attrs: { src: "https://example.com/image.png", alt: "示例" },
    },
    {
      type: "bilibili",
      attrs: { bvid: "BV1xx411c7mD", page: 1, autoplay: false },
    },
    {
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [{ type: "text", text: "const answer: number = 42;" }],
    },
  ],
};

describe("TipTap serialization", () => {
  it("accepts the canonical document shape", () => {
    expect(validateTiptapDocument(document).success).toBe(true);
  });

  it("round-trips generated HTML through the shared schema", () => {
    // 一次性内容迁移依赖这条链路：HTML 文本 → 结构化内容 → 白名单校验。
    const converted = htmlToTiptapDocument(
      generateHTML(document, serverEditorExtensions)
    );

    expect(validateTiptapDocument(converted).success).toBe(true);
    expect(converted.content?.some((node) => node.type === "callout")).toBe(
      true
    );
    expect(converted.content?.some((node) => node.type === "bilibili")).toBe(
      true
    );
  });

  it("extracts plain text and image URLs", () => {
    expect(extractTiptapText(document)).toContain("标题");
    expect(extractTiptapText(document)).toContain("提示内容");
    expect(extractTiptapImageUrls(document)).toEqual([
      "https://example.com/image.png",
    ]);
  });

  it("rejects unsupported content and detects empty documents", () => {
    expect(
      validateTiptapDocument({
        type: "doc",
        content: [{ type: "script", text: "bad" }],
      }).success
    ).toBe(false);
    expect(
      validateTiptapDocument({
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "javascript\" onclick=\"alert(1)" },
            content: [{ type: "text", text: "bad" }],
          },
        ],
      }).success
    ).toBe(false);
    expect(
      isTiptapDocumentEmpty({
        type: "doc",
        content: [{ type: "paragraph" }],
      })
    ).toBe(true);
  });

  it("normalizes nullable editor fields and non-content metadata", () => {
    const result = validateTiptapDocument({
      type: "doc",
      attrs: null,
      content: [
        {
          type: "paragraph",
          attrs: null,
          content: [
            {
              type: "text",
              text: "可以发布",
              marks: null,
              transientMetadata: { source: "editor" },
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attrs).toBeUndefined();
      expect(result.data.content?.[0]?.attrs).toBeUndefined();
      expect(result.data.content?.[0]?.content?.[0]?.marks).toBeUndefined();
    }
  });

  it("drops link marks without a target and rejects unsafe protocols", () => {
    const withoutHref = validateTiptapDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "伪链接", marks: [{ type: "link" }] }],
        },
      ],
    });
    expect(withoutHref.success).toBe(true);
    if (withoutHref.success) {
      expect(withoutHref.data.content?.[0]?.content?.[0]?.marks).toBeUndefined();
    }

    for (const href of ["javascript:alert(1)", "data:text/html,x", "vbscript:x"]) {
      expect(
        validateTiptapDocument({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "bad", marks: [{ type: "link", attrs: { href } }] },
              ],
            },
          ],
        }).success
      ).toBe(false);
    }
  });

  it("converts AI plain text into controlled paragraphs", () => {
    expect(plainTextToTiptapContent("第一段\n换行\n\n第二段")).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "第一段" },
          { type: "hardBreak" },
          { type: "text", text: "换行" },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "第二段" }],
      },
    ]);
  });
});
