import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import graphql from "highlight.js/lib/languages/graphql";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";

export const CODE_BLOCK_LANGUAGES = [
  { value: "plaintext", label: "纯文本" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "tsx", label: "TSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
  { value: "yaml", label: "YAML" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "graphql", label: "GraphQL" },
  { value: "diff", label: "Diff" },
] as const;

/**
 * 只注册语言菜单里出现过的语法，而不是 lowlight 的 `common` 全集。
 *
 * 改动前请先读完这三条：
 *
 * 1. **为什么不用 `common`**：它一次带进 37 个语法（含 `arduino`、`lua`、`wasm`、
 *    `objectivec` 这些菜单里根本选不到的），而这份集合同时进编辑器包与文章页的
 *    服务端渲染依赖图。这里按 `CODE_BLOCK_LANGUAGES` 逐个注册，只留 23 个。
 * 2. **为什么 `highlight.js` 必须留在 `package.json` 里**：它本来是 `lowlight` 的
 *    传递依赖，本机 `node-linker=hoisted` 能侥幸解析到，但 Vercel 用 pnpm 默认的
 *    隔离布局，解析不到未声明的包 —— 删除该依赖会让线上构建直接失败。
 * 3. **菜单值与语法的对应**：highlight.js 没有独立的 jsx/tsx/html 语法，所以
 *    `jsx`→`javascript`、`tsx`→`typescript`、`html`→`xml` 三对共用同一份语法；
 *    `plaintext` 不需要语法，由 `defaultLanguage` 短路成纯文本。
 *
 * 未注册的语言不会报错：`highlight.ts` 在 `highlight()` 抛错时退回 `highlightAuto()`，
 * 因此历史内容里出现菜单外的语言（如 `lua`）仍会被自动识别，只是结果可能与
 * `common` 全集不完全一致。
 */
export const codeBlockLowlight = createLowlight({
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  go,
  graphql,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  php,
  python,
  ruby,
  rust,
  scss,
  sql,
  swift,
  typescript,
  xml,
  yaml,
});

export function isSafeCodeLanguage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 32 &&
    /^[a-z0-9+#.-]+$/i.test(value)
  );
}

export function getCodeLanguageLabel(language: string): string {
  return (
    CODE_BLOCK_LANGUAGES.find((option) => option.value === language)?.label ??
    language.toUpperCase()
  );
}

const EnhancedCodeBlockLowlight = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => {
        if (!this.editor.isActive(this.name)) return false;
        return this.editor.commands.insertContent("  ");
      },
      "Shift-Tab": () => {
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== this.name) return false;

        const textBeforeCursor = $from.parent.textBetween(
          0,
          $from.parentOffset,
          "\n"
        );
        const lineOffset = textBeforeCursor.lastIndexOf("\n") + 1;
        const line = $from.parent.textContent.slice(lineOffset);
        const indentLength = line.startsWith("\t")
          ? 1
          : line.startsWith("  ")
            ? 2
            : line.startsWith(" ")
              ? 1
              : 0;
        if (indentLength === 0) return false;

        const lineStart = $from.start() + lineOffset;
        view.dispatch(state.tr.delete(lineStart, lineStart + indentLength));
        return true;
      },
    };
  },
});

export const CodeBlockNode = EnhancedCodeBlockLowlight.configure({
  lowlight: codeBlockLowlight,
  defaultLanguage: "plaintext",
  HTMLAttributes: {
    class: "tiptap-code-block",
  },
});
