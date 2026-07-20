import { describe, expect, it } from "vitest";
import {
  buildEditorAiPrompt,
  editorAiRequestSchema,
  MAX_EDITOR_AI_SELECTION_CHARS,
} from "./ai";

describe("editor AI input", () => {
  it("requires a selection for transform actions", () => {
    const result = editorAiRequestSchema.safeParse({
      action: "polish",
      selectedText: "",
      context: "上下文",
    });
    expect(result.success).toBe(false);
  });

  it("allows continue without a selection", () => {
    expect(
      editorAiRequestSchema.safeParse({
        action: "continue",
        selectedText: "",
        context: "已有文章",
      }).success
    ).toBe(true);
  });

  it("enforces selection size and builds a bounded task prompt", () => {
    expect(
      editorAiRequestSchema.safeParse({
        action: "rewrite",
        selectedText: "x".repeat(MAX_EDITOR_AI_SELECTION_CHARS + 1),
        context: "",
      }).success
    ).toBe(false);

    const prompt = buildEditorAiPrompt({
      action: "rewrite",
      selectedText: "原文",
      context: "文章上下文",
    });
    expect(prompt).toContain("保留原意");
    expect(prompt).toContain("原文");
    expect(prompt).toContain("文章上下文");
  });
});
