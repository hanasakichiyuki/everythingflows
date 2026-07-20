import { z } from "zod";

export const EDITOR_AI_ACTIONS = [
  "continue",
  "rewrite",
  "polish",
  "expand",
  "shorten",
  "summarize",
] as const;

export type EditorAiAction = (typeof EDITOR_AI_ACTIONS)[number];

export const EDITOR_AI_ACTION_LABELS: Record<EditorAiAction, string> = {
  continue: "续写",
  rewrite: "改写",
  polish: "润色",
  expand: "扩写",
  shorten: "缩写",
  summarize: "摘要",
};

export const MAX_EDITOR_AI_SELECTION_CHARS = 8_000;
export const MAX_EDITOR_AI_CONTEXT_CHARS = 20_000;

export const editorAiRequestSchema = z
  .object({
    action: z.enum(EDITOR_AI_ACTIONS),
    selectedText: z.string().max(MAX_EDITOR_AI_SELECTION_CHARS),
    context: z.string().max(MAX_EDITOR_AI_CONTEXT_CHARS),
    modelId: z.string().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.action !== "continue" &&
      value.selectedText.trim().length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedText"],
        message: "该操作需要先选择文本",
      });
    }
  });

const ACTION_INSTRUCTIONS: Record<EditorAiAction, string> = {
  continue: "从上下文结尾自然续写 1 至 3 段，不要重复已有内容。",
  rewrite: "保留原意和事实，换一种更自然清晰的表达。",
  polish: "修正病句、用词和节奏，让文字更准确流畅。",
  expand: "在不编造事实的前提下补充细节、解释和过渡。",
  shorten: "删除重复和次要内容，压缩为更精炼的表达。",
  summarize: "概括核心信息，生成一段简洁摘要。",
};

export function buildEditorAiPrompt(input: {
  action: EditorAiAction;
  selectedText: string;
  context: string;
}): string {
  const selected = input.selectedText.trim();
  const context = input.context.trim();

  return [
    `任务：${ACTION_INSTRUCTIONS[input.action]}`,
    "只输出可直接插入文章的正文，不要解释任务，不要使用 Markdown 代码围栏。",
    context ? `文章上下文：\n${context}` : "",
    selected ? `待处理文本：\n${selected}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
