import { describe, expect, it } from "vitest";
import { sanitizeHtmlContent } from "./HtmlContent";

describe("article HTML sanitization", () => {
  it("removes scripts, event handlers, and untrusted iframes", () => {
    const clean = sanitizeHtmlContent(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><iframe src="https://evil.example/embed"></iframe>'
    );
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<iframe");
  });

  it("keeps a constrained Bilibili iframe", () => {
    const clean = sanitizeHtmlContent(
      '<div data-bilibili-embed><iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD" onload="alert(1)"></iframe></div>'
    );
    expect(clean).toContain("<iframe");
    expect(clean).toContain("player.bilibili.com");
    expect(clean).toContain("sandbox=");
    expect(clean).toContain("allowfullscreen=");
    expect(clean).not.toContain("onload");
  });

  it("keeps allowed callout metadata", () => {
    const clean = sanitizeHtmlContent(
      '<aside data-callout-type="warning" class="tiptap-callout"><p>注意</p></aside>'
    );
    expect(clean).toContain('data-callout-type="warning"');
    expect(clean).toContain("注意");
  });

  it("syntax-highlights fenced code without trusting its contents", () => {
    const clean = sanitizeHtmlContent(
      '<pre><code class="language-javascript">const value = "&lt;script&gt;";</code></pre>'
    );
    expect(clean).toContain("hljs-keyword");
    expect(clean).toContain("language-javascript");
    expect(clean).not.toContain("<script>");
  });
});
