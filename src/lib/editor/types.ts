import type { JSONContent } from "@tiptap/core";
import { z } from "zod";

export type TiptapDocument = JSONContent & {
  type: "doc";
};

export const EMPTY_TIPTAP_DOCUMENT: TiptapDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const MAX_TIPTAP_JSON_CHARS = 1_000_000;

const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "image",
  "bilibili",
  "callout",
]);

const ALLOWED_MARK_TYPES = new Set([
  "bold",
  "italic",
  "strike",
  "code",
  "link",
  "underline",
]);

const attrsSchema = z.record(z.string(), z.unknown()).optional();

const markSchema = z
  .object({
    type: z.string().min(1),
    attrs: attrsSchema,
  })
  .strict();

const nodeSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      attrs: attrsSchema,
      content: z.array(nodeSchema).optional(),
      marks: z.array(markSchema).optional(),
      text: z.string().optional(),
    })
    .strict()
);

function validateSemantics(
  node: JSONContent,
  depth = 0,
  counter = { value: 0 }
): string | null {
  counter.value += 1;
  if (counter.value > 20_000) return "编辑器内容节点过多";
  if (depth > 40) return "编辑器内容嵌套过深";

  if (!node.type || !ALLOWED_NODE_TYPES.has(node.type)) {
    return `不支持的编辑器节点：${node.type ?? "(missing)"}`;
  }

  for (const mark of node.marks ?? []) {
    if (!ALLOWED_MARK_TYPES.has(mark.type)) {
      return `不支持的编辑器标记：${mark.type}`;
    }
  }

  if (node.type === "text" && typeof node.text !== "string") {
    return "文本节点缺少 text";
  }

  if (node.type === "codeBlock") {
    const language = node.attrs?.language;
    if (
      language !== undefined &&
      language !== null &&
      (typeof language !== "string" ||
        language.length > 32 ||
        !/^[a-z0-9+#.-]+$/i.test(language))
    ) {
      return "代码块语言无效";
    }
  }

  if (node.type === "image") {
    const src = node.attrs?.src;
    if (typeof src !== "string" || !/^https?:\/\//i.test(src)) {
      return "图片节点地址无效";
    }
  }

  if (node.type === "bilibili") {
    const bvid = node.attrs?.bvid;
    const aid = node.attrs?.aid;
    if (
      (typeof bvid !== "string" || !/^BV[0-9A-Za-z]{10}$/.test(bvid)) &&
      (typeof aid !== "string" || !/^\d+$/.test(aid))
    ) {
      return "Bilibili 节点缺少有效的视频编号";
    }
  }

  if (node.type === "callout") {
    const kind = node.attrs?.kind;
    if (
      kind !== undefined &&
      !["info", "success", "warning", "danger"].includes(String(kind))
    ) {
      return "Callout 类型无效";
    }
  }

  for (const child of node.content ?? []) {
    const error = validateSemantics(child, depth + 1, counter);
    if (error) return error;
  }

  return null;
}

export type TiptapValidationResult =
  | { success: true; data: TiptapDocument }
  | { success: false; error: string };

export function validateTiptapDocument(input: unknown): TiptapValidationResult {
  let value = input;
  if (typeof value === "string") {
    if (value.length > MAX_TIPTAP_JSON_CHARS) {
      return { success: false, error: "编辑器内容过大" };
    }
    try {
      value = JSON.parse(value);
    } catch {
      return { success: false, error: "编辑器 JSON 格式错误" };
    }
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { success: false, error: "编辑器内容无法序列化" };
  }
  if (serialized.length > MAX_TIPTAP_JSON_CHARS) {
    return { success: false, error: "编辑器内容过大" };
  }

  const parsed = nodeSchema.safeParse(value);
  if (!parsed.success || parsed.data.type !== "doc") {
    return { success: false, error: "编辑器文档结构无效" };
  }

  const semanticError = validateSemantics(parsed.data);
  if (semanticError) return { success: false, error: semanticError };

  return { success: true, data: parsed.data as TiptapDocument };
}

export function isTiptapDocumentEmpty(doc: TiptapDocument): boolean {
  const hasMeaningfulNode = (node: JSONContent): boolean => {
    if (node.type === "text" && node.text?.trim()) return true;
    if (["image", "bilibili", "horizontalRule"].includes(node.type ?? "")) {
      return true;
    }
    return (node.content ?? []).some(hasMeaningfulNode);
  };

  return !hasMeaningfulNode(doc);
}

export function cloneTiptapDocument(doc: TiptapDocument): TiptapDocument {
  return JSON.parse(JSON.stringify(doc)) as TiptapDocument;
}
