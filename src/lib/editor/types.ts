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

// TipTap/ProseMirror 会根据扩展及导入来源省略 attrs，部分文档还会将其
// 序列化为 null。两者都等价于没有属性，先规范化后再做节点白名单校验。
const attrsSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional()
  .transform((attrs) => attrs ?? undefined);

const markSchema = z
  .object({
    type: z.string().min(1),
    attrs: attrsSchema,
  });

const nodeSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      attrs: attrsSchema,
      content: z.array(nodeSchema).optional(),
      marks: z.array(markSchema).optional(),
      text: z.string().optional(),
    })
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * TipTap JSON 的可选字段在不同编辑器扩展、导入路径及 Server Action 传输中
 * 可能表现为缺失、undefined 或 null。只保留规范字段并统一为空缺省值，避免把
 * 序列化差异误判为文档损坏；节点类型和属性内容仍由后续白名单校验负责。
 */
function normalizeTiptapNode(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const node: Record<string, unknown> = {};
  if (typeof value.type === "string") node.type = value.type;
  if (isRecord(value.attrs)) node.attrs = value.attrs;
  if (Array.isArray(value.content)) {
    node.content = value.content.map(normalizeTiptapNode);
  }
  if (Array.isArray(value.marks)) {
    node.marks = value.marks.map((mark) => {
      if (!isRecord(mark)) return mark;
      const normalizedMark: Record<string, unknown> = {};
      if (typeof mark.type === "string") normalizedMark.type = mark.type;
      if (isRecord(mark.attrs)) normalizedMark.attrs = mark.attrs;
      return normalizedMark;
    });
  }
  if (typeof value.text === "string") node.text = value.text;

  return node;
}

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

  const parsed = nodeSchema.safeParse(normalizeTiptapNode(value));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const location = issue?.path.length ? issue.path.join(".") : "根节点";
    return {
      success: false,
      error: `编辑器文档结构无效：${location} 的数据格式不正确`,
    };
  }
  if (parsed.data.type !== "doc") {
    return { success: false, error: "编辑器文档结构无效：根节点必须是 doc" };
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
