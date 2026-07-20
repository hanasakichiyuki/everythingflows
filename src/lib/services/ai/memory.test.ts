import { describe, expect, it } from "vitest";
import { estimateMessagesTokens, estimateTokens } from "./memory";

describe("chat token estimates", () => {
  it("returns zero for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("accounts for CJK text and message framing", () => {
    expect(estimateTokens("你好")).toBeGreaterThanOrEqual(3);
    expect(estimateMessagesTokens([{ role: "user", content: "你好" }])).toBeGreaterThanOrEqual(13);
  });
});
