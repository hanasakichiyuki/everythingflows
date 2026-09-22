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

  it("keeps originalSrc across an HTML round-trip", () => {
    // 这条断言守护的是"属性已声明"：ProseMirror 会按节点 schema 过滤属性，未声明的键
    // 在 updateAttributes / 粘贴 / 重新加载时会被静默丢弃，表现为"写得进去、存不下来"。
    const html = generateHTML(
      {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              src: "https://example.com/display.webp",
              originalSrc: "https://example.com/display.orig.png",
            },
          },
        ],
      },
      serverEditorExtensions
    );

    expect(html).toContain('data-original-src="https://example.com/display.orig.png"');

    const converted = htmlToTiptapDocument(html);
    expect(converted.content?.[0]?.attrs?.originalSrc).toBe(
      "https://example.com/display.orig.png"
    );
  });

  it("collects the original image URL and validates its protocol", () => {
    const withOriginal: TiptapDocument = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://example.com/display.webp",
            originalSrc: "https://example.com/display.orig.png",
          },
        },
      ],
    };

    // 原图必须一起收集：漏掉它，删除图片时的 R2 清理就会留下孤儿对象，
    // 写入侧的"非本站图片"校验也会漏检这一处。
    expect(extractTiptapImageUrls(withOriginal)).toEqual([
      "https://example.com/display.webp",
      "https://example.com/display.orig.png",
    ]);
    expect(validateTiptapDocument(withOriginal).success).toBe(true);

    // 原图会被渲染成可点击的"查看原图"入口，所以和链接一样只放行 http(s)。
    for (const originalSrc of [
      "javascript:alert(1)",
      "data:image/svg+xml,%3Csvg/%3E",
      "/local.png",
    ]) {
      expect(
        validateTiptapDocument({
          type: "doc",
          content: [
            {
              type: "image",
              attrs: { src: "https://example.com/display.webp", originalSrc },
            },
          ],
        }).success
      ).toBe(false);
    }

    // 旧数据（没有这个字段）必须照常通过。
    expect(
      validateTiptapDocument({
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://example.com/plain.webp" } },
        ],
      }).success
    ).toBe(true);
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
