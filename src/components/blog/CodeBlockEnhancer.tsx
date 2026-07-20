"use client";

import { useEffect, useRef } from "react";

const LANGUAGE_LABELS: Record<string, string> = {
  plaintext: "TEXT",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  html: "HTML",
  xml: "HTML",
  css: "CSS",
  json: "JSON",
  bash: "Bash",
  shell: "Shell",
  python: "Python",
  java: "Java",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  markdown: "Markdown",
  yaml: "YAML",
};

function languageFromCode(code: HTMLElement): string {
  const languageClass = [...code.classList].find((className) =>
    className.startsWith("language-")
  );
  return languageClass?.slice("language-".length) || "plaintext";
}

export function CodeBlockEnhancer() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = markerRef.current?.previousElementSibling;
    if (!(root instanceof HTMLElement)) return;

    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
      const pre = code.parentElement;
      if (!pre || pre.dataset.codeEnhanced === "true") return;

      const language = languageFromCode(code);
      const badge = document.createElement("span");
      badge.className = "code-language-badge";
      badge.textContent = LANGUAGE_LABELS[language] ?? language.toUpperCase();
      badge.setAttribute("aria-hidden", "true");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-button";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");

      let resetTimer: ReturnType<typeof setTimeout> | null = null;
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? "");
          button.textContent = "已复制";
          button.dataset.copied = "true";
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(() => {
            button.textContent = "复制";
            delete button.dataset.copied;
          }, 1600);
        } catch {
          button.textContent = "复制失败";
        }
      };

      button.addEventListener("click", copy);
      pre.dataset.codeEnhanced = "true";
      pre.append(badge, button);

      cleanups.push(() => {
        if (resetTimer) clearTimeout(resetTimer);
        button.removeEventListener("click", copy);
        badge.remove();
        button.remove();
        delete pre.dataset.codeEnhanced;
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return <span ref={markerRef} className="hidden" aria-hidden="true" />;
}
