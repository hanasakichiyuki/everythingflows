import { describe, expect, it } from "vitest";
import {
  MAX_FRAGMENT_TEXT_LENGTH,
  validateFragmentText,
} from "./fragment-validation";

describe("fragment text validation", () => {
  it("normalizes optional empty captions to null", () => {
    expect(validateFragmentText("  ", { required: false })).toEqual({
      ok: true,
      text: null,
    });
  });

  it("rejects empty text fragments", () => {
    expect(validateFragmentText("  ", { required: true }).ok).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(validateFragmentText({ text: "invalid" }, { required: false }).ok).toBe(false);
  });

  it("rejects text over the shared limit", () => {
    expect(
      validateFragmentText("a".repeat(MAX_FRAGMENT_TEXT_LENGTH + 1), {
        required: false,
      }).ok,
    ).toBe(false);
  });
});
