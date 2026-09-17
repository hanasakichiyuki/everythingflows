import { createElement, Fragment, type ReactNode } from "react";
import { codeBlockLowlight } from "./code-block";

/**
 * 代码块高亮：把 lowlight 的词法分析结果转成 React 节点。
 *
 * 边界（刻意收得很窄，请勿扩展）：
 * - 输入只可能是 highlight.js 对**纯文本**做词法分析后产生的 hast，因此这里的
 *   span/class 属于展示性 token，**不是**一段需要净化的 HTML。禁止把任意 HTML
 *   交给本模块，也禁止把内部 walk 复用成通用 HTML→React 渲染器。
 * - 只认 `span` 元素，且只保留形如 `hljs-*` / `language-*` 的 class（hast 的
 *   class 是数组，任何其它属性一律忽略）；遇到未知结构就透传子节点、不报错。
 * - 唯一对外出口是 `highlightCodeToReact`。
 */

/** 与旧实现一致的护栏：超长代码块直接跳过高亮，避免正则回溯拖垮服务端渲染。 */
const MAX_HIGHLIGHT_CHARS = 50_000;

/**
 * hljs 产出的 class 有两类，**都必须保留**：
 *
 * 1. 作用域类 `hljs-<scope>`（如 `hljs-keyword`、`hljs-title`）；
 * 2. 修饰类，用来区分同名作用域下的细分语义，命名约定是**以 `_` 结尾**
 *    （如 `function_`、`class_`、`inherited__`、`language_`）。
 *
 * 主题 CSS 里存在 `.hljs-variable.language_`、`.hljs-title.function_` 这类"双类"选择器，
 * 丢掉修饰类会让对应 token 掉回其它规则的颜色（实测 `hljs-variable language_` 会从
 * 关键字的红变成变量的蓝）。修饰类只含字母/数字/下划线，不接受其它字符，无注入面。
 */
const TOKEN_CLASS_PATTERN = /^(?:hljs|language)-[a-z0-9_-]+$/i;
const SCOPE_MODIFIER_PATTERN = /^[a-z][a-z0-9_]*_$/i;

function isTokenClass(value: string): boolean {
  return TOKEN_CLASS_PATTERN.test(value) || SCOPE_MODIFIER_PATTERN.test(value);
}

/** 这些语言名不存在 token 语义，直接输出纯文本（与旧 hljs 行为一致）。 */
const PLAIN_LANGUAGES = new Set([
  "plaintext",
  "plain",
  "text",
  "txt",
  "no-highlight",
]);

type HastText = { type: "text"; value?: string };
type HastElement = {
  type: "element";
  tagName?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
};
type HastRoot = { type: "root"; children?: HastNode[] };
type HastNode = HastText | HastElement | HastRoot | { type: string };

function tokenClasses(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];

  return raw.filter(
    (item): item is string => typeof item === "string" && isTokenClass(item)
  );
}

/** 递归映射 hast；非 span 结构一律透传子节点。 */
function renderHast(node: HastNode, key: string): ReactNode {
  if (node.type === "text") return (node as HastText).value ?? "";

  if (node.type === "root" || node.type === "element") {
    const source =
      (node as HastRoot | HastElement).children ?? [];
    const children = source.map((child, index) =>
      renderHast(child, `${key}.${index}`)
    );

    if (node.type === "element" && (node as HastElement).tagName === "span") {
      const classes = tokenClasses((node as HastElement).properties?.className);
      if (classes.length > 0) {
        return createElement(
          "span",
          { key, className: classes.join(" ") },
          children
        );
      }
    }

    return createElement(Fragment, { key }, children);
  }

  return null;
}

function normalizeHighlightLanguage(
  language: string | null | undefined
): string | null {
  if (typeof language !== "string") return null;
  const value = language.trim().toLowerCase();
  if (!value || PLAIN_LANGUAGES.has(value)) return null;
  return value;
}

/**
 * 渲染代码块内容。语言未注册时退回自动检测（对齐旧的 `hljs.highlightAuto`），
 * 任何异常都降级为纯文本 —— React 会把文本当文本节点输出，天然转义。
 *
 * 注意：lowlight 只加载了 `common` 语法集（编辑器同一套）。旧实现用的是
 * highlight.js 全量语法集，因此极冷门语言的高亮结果可能与历史输出不同；
 * 语言 class 始终保留，不影响结构与样式。
 */
export function highlightCodeToReact(
  code: string,
  language: string | null
): ReactNode {
  const value = code ?? "";
  if (!value) return null;

  const lang = normalizeHighlightLanguage(language);
  if (!lang || value.length > MAX_HIGHLIGHT_CHARS) return value;

  try {
    let highlighted: unknown;
    try {
      highlighted = codeBlockLowlight.highlight(lang, value);
    } catch {
      highlighted = codeBlockLowlight.highlightAuto(value);
    }
    return renderHast(highlighted as HastRoot, "hljs");
  } catch {
    return value;
  }
}
