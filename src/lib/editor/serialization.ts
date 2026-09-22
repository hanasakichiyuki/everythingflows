import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { serverEditorExtensions } from "./extensions";
import {
  EMPTY_TIPTAP_DOCUMENT,
  type TiptapDocument,
  validateTiptapDocument,
} from "./types";

const BLOCK_NODE_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "taskItem",
  "callout",
]);

export function htmlToTiptapDocument(html: string): TiptapDocument {
  if (!html.trim()) return structuredClone(EMPTY_TIPTAP_DOCUMENT);

  const generated = generateJSON(html, serverEditorExtensions);
  const result = validateTiptapDocument(generated);
  if (!result.success) {
    throw new Error(`HTML 转换失败：${result.error}`);
  }
  return result.data;
}

export function extractTiptapText(doc: TiptapDocument): string {
  const chunks: string[] = [];

  const visit = (node: JSONContent) => {
    if (node.type === "text" && node.text) {
      chunks.push(node.text);
      return;
    }
    if (node.type === "hardBreak") {
      chunks.push("\n");
      return;
    }

    for (const child of node.content ?? []) visit(child);
    if (BLOCK_NODE_TYPES.has(node.type ?? "")) chunks.push("\n");
  };

  visit(doc);
  return chunks
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 收集正文里全部图片地址（展示图 + 原图）。
 *
 * 原图必须一起收集：它同样是本站在 R2 里的一份对象，漏掉它会让"图片删除后清理 R2"
 * 失效 —— 原图会作为孤儿对象永远留在桶里；写入侧的"非本站图片"校验也会漏检这一处。
 */
export function extractTiptapImageUrls(doc: TiptapDocument): string[] {
  const urls = new Set<string>();
  const stack: JSONContent[] = [doc];

  const collect = (value: unknown) => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      urls.add(value);
    }
  };

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "image") {
      collect(node.attrs?.src);
      collect(node.attrs?.originalSrc);
    }
    stack.push(...(node.content ?? []));
  }

  return [...urls];
}

export function stableTiptapJson(doc: TiptapDocument): string {
  return JSON.stringify(doc);
}

export function plainTextToTiptapContent(text: string): JSONContent[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (paragraphs.length > 0 ? paragraphs : [text.trim()]).map(
    (paragraph) => {
      const lines = paragraph.split("\n");
      const content: JSONContent[] = [];
      lines.forEach((line, index) => {
        if (index > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return { type: "paragraph", content };
    }
  );
}
