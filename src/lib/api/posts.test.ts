import { describe, expect, it } from "vitest";
import { getPostSaveErrorMessage } from "./posts";

describe("post save errors", () => {
  it("identifies a database that has not received the TipTap migration", () => {
    expect(
      getPostSaveErrorMessage({
        code: "PGRST204",
        message: "Could not find the 'content_json' column of 'posts' in the schema cache",
      })
    ).toContain("004_posts_tiptap_content.sql");
  });

  it("keeps the message from plain-object Supabase errors", () => {
    expect(
      getPostSaveErrorMessage({ code: "PGRST301", message: "Database unavailable" })
    ).toBe("保存文章失败：Database unavailable");
  });
});
