"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import {
  CODE_BLOCK_LANGUAGES,
  getCodeLanguageLabel,
  isSafeCodeLanguage,
} from "@/lib/editor/code-block";

export function CodeBlockNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageSelectId = useId();
  const language = isSafeCodeLanguage(node.attrs.language)
    ? node.attrs.language
    : "plaintext";
  const hasCustomLanguage = !CODE_BLOCK_LANGUAGES.some(
    (option) => option.value === language
  );

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    []
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      window.alert("复制失败，请手动选择代码");
    }
  };

  return (
    <NodeViewWrapper
      className="tiptap-code-editor"
      data-language={language}
    >
      <div
        className="tiptap-code-editor-toolbar"
        contentEditable={false}
      >
        <span
          className="flex items-center gap-2 text-xs text-white/55"
          data-drag-handle
        >
          <Code2 className="h-3.5 w-3.5" />
          代码
        </span>
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor={languageSelectId}>
            代码语言
          </label>
          <select
            id={languageSelectId}
            value={language}
            onChange={(event) =>
              updateAttributes({ language: event.target.value })
            }
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/75 outline-none transition hover:bg-white/10 focus:border-pink-400/60"
            aria-label="代码语言"
          >
            {hasCustomLanguage && (
              <option value={language}>{getCodeLanguageLabel(language)}</option>
            )}
            {CODE_BLOCK_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="复制代码"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>
      <pre>
        <NodeViewContent as="code" spellCheck={false} />
      </pre>
    </NodeViewWrapper>
  );
}
