import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TiptapContent } from "./TiptapContent";
import type { TiptapDocument } from "@/lib/editor/types";

/**
 * 行为契约。
 *
 * 这些断言原先由 `HtmlContent.test.ts` 覆盖「generateHTML + DOMPurify」的净化行为；
 * 改成结构化渲染后，净化环节已不存在，因此断言迁移为「渲染结果必须满足的安全与
 * 结构性质」—— 脚本与事件属性不可能出现、B 站 iframe 属性固定、callout 元数据正确、
 * 代码高亮不信任代码内容、图片仅允许本站 R2 且走同源代理。
 */

const originalR2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

afterEach(() => {
  if (originalR2PublicBaseUrl === undefined) {
    delete process.env.R2_PUBLIC_BASE_URL;
  } else {
    process.env.R2_PUBLIC_BASE_URL = originalR2PublicBaseUrl;
  }
});

function render(doc: TiptapDocument): string {
  return renderToStaticMarkup(<TiptapContent doc={doc} />);
}

describe("TiptapContent 结构化渲染", () => {
  it("把正文文本当作文本输出，脚本与事件属性无法出现", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: '<script>alert(1)</script><img src=x onerror=alert(1)>' }],
        },
      ],
    });

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script");
    // 尖括号被转义成纯文本，因此不会产生任何 img 元素/事件属性
    expect(html).not.toContain("<img");
    expect(html).toContain("onerror=alert(1)&gt;");
    expect(html).toContain('<div class="prose-blog" data-rich-content="true">');
  });

  it("静默跳过白名单之外的节点类型", () => {
    const html = render({
      type: "doc",
      content: [
        { type: "script", attrs: { src: "https://evil.example/x.js" } },
        { type: "paragraph", content: [{ type: "text", text: "保留内容" }] },
      ],
    } as unknown as TiptapDocument);

    expect(html).toContain("保留内容");
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("<script");
  });

  it("生成属性固定的 Bilibili iframe，编号无效时输出占位", () => {
    const html = render({
      type: "doc",
      content: [
        { type: "bilibili", attrs: { bvid: "BV1xx411c7mD", page: 1, autoplay: false } },
        { type: "bilibili", attrs: { bvid: "not-a-bvid", page: 1, autoplay: false } },
      ],
    });

    expect(html).toContain("player.bilibili.com");
    expect(html).toContain("sandbox=");
    expect(html).toContain("allowfullscreen");
    expect(html).toContain('data-bvid="BV1xx411c7mD"');
    // 非法编号只输出占位文案，不产生 iframe
    expect(html).toContain("无效的 Bilibili 视频");
    expect(html).toContain("tiptap-bilibili-invalid");
    expect((html.match(/<iframe/g) ?? []).length).toBe(1);
  });

  it("保留 callout 元数据，但不泄漏非法的 kind 属性", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "warning" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "注意" }] }],
        },
      ],
    });

    expect(html).toContain('data-callout-type="warning"');
    expect(html).toContain("tiptap-callout-warning");
    expect(html).toContain("注意");
    // 旧管线会把节点属性直接漏到 DOM 上，这里必须没有
    expect(html).not.toMatch(/<aside[^>]*\skind=/);
  });

  it("高亮代码但始终转义代码内容", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript" },
          content: [{ type: "text", text: 'const value = "<script>";' }],
        },
      ],
    });

    expect(html).toContain("hljs-keyword");
    expect(html).toContain("language-javascript");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("保留 hljs 的修饰类名，主题里的双类选择器才能命中", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript" },
          content: [
            { type: "text", text: "function foo() {} class Bar {} const x = this;" },
          ],
        },
      ],
    });

    // 主题 CSS 里有 `.hljs-title.function_`、`.hljs-variable.language_` 这类双类选择器：
    // 只保留 `hljs-*` 会把修饰类丢掉，对应 token 便掉回其它规则的颜色。
    expect(html).toContain("hljs-title function_");
    expect(html).toContain("hljs-title class_");
    expect(html).toContain("hljs-variable language_");
  });

  it("未指定语言的代码块按纯文本输出，不加 token", () => {
    const html = render({
      type: "doc",
      content: [{ type: "codeBlock", content: [{ type: "text", text: "plain here" }] }],
    });

    expect(html).toContain("language-plaintext");
    expect(html).toContain("plain here");
    expect(html).not.toContain("hljs-keyword");
  });

  it("只保留配置的 R2 图片并改写为同源代理地址", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com";

    const html = render({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://media.example.com/posts/photo.webp", alt: "R2" } },
        {
          type: "image",
          attrs: {
            src: "https://project.supabase.co/storage/v1/object/public/post-images/old.webp",
            alt: "legacy",
          },
        },
      ],
    });

    expect(html).toContain(
      `/api/post-image?src=${encodeURIComponent("https://media.example.com/posts/photo.webp")}`
    );
    expect(html).not.toContain("project.supabase.co");
    expect((html.match(/<img/g) ?? []).length).toBe(1);
  });

  it("未配置 R2 域名时不渲染任何图片", () => {
    delete process.env.R2_PUBLIC_BASE_URL;

    const html = render({
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://media.example.com/posts/photo.webp" } }],
    });

    expect(html).not.toContain("<img");
  });

  it("标题层级按 levels 归一，非法或缺省退回 h2", () => {
    const html = render({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "三" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "一" }] },
        { type: "heading", content: [{ type: "text", text: "无" }] },
      ],
    });

    expect(html).toContain('<h3 class="tiptap-heading">三</h3>');
    expect(html).toContain('<h2 class="tiptap-heading">一</h2>');
    expect(html).toContain('<h2 class="tiptap-heading">无</h2>');
    expect(html).not.toContain("<h1");
  });

  it("任务列表输出 label/input/span/div 结构，供 CSS 依赖", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "已完成" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "未完成" }] }],
            },
          ],
        },
      ],
    });

    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-type="taskItem"');
    expect(html).toContain('<label><input type="checkbox"');
    expect(html).toContain("<div><p>已完成</p></div>");
    // 与上游一致：checked 的 renderHTML 返回布尔值，DOMSerializer 写成 "true"/"false"
    // 且两种状态下属性都存在（不能只靠属性有无来判断勾选状态）。
    expect(html).toContain(
      '<li class="tiptap-task-item" data-checked="true" data-type="taskItem">'
    );
    expect(html).toContain(
      '<li class="tiptap-task-item" data-checked="false" data-type="taskItem">'
    );
  });

  it("链接标记输出安全属性，缺少 href 时退化为纯文本", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "外链",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
            { type: "text", text: "伪链接", marks: [{ type: "link" }] },
          ],
        },
      ],
    });

    expect(html).toContain('href="https://example.com"');
    // target/rel 对所有链接生效，与编辑器链路一致：extensions.ts 的 Link 扩展
    // 无条件配置了 HTMLAttributes.target/rel，因此站内路径 / 锚点 / mailto 也不区分。
    expect(html).toContain('rel="noopener noreferrer"');
    expect((html.match(/<a /g) ?? []).length).toBe(1);
    expect(html).toContain("伪链接");
  });
});
