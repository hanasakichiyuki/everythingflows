"use client";

import { useState, useCallback, memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const codeChild = Array.isArray(children) ? children[0] : children;
  const className =
    codeChild && typeof codeChild === "object" && "props" in codeChild
      ? ((codeChild as { props: { className?: string } }).props.className ?? "")
      : "";
  const language = className.replace("language-", "") || "code";
  const codeText = extractText(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [codeText]);

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border bg-black/5 dark:bg-black/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted">
        <span className="font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-muted transition-all hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
          title="复制代码"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className={`font-mono ${className}`}>{children}</code>
      </pre>
    </div>
  );
}

/** 规整 markdown 原文：去首尾空白、连续 3+ 换行折叠为 2 个（即单个段落 break） */
function normalizeMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  const normalized = normalizeMarkdown(content);
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-pre:bg-transparent prose-pre:m-0 prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none prose-p:my-1 prose-p:first:mt-0 prose-p:last:mb-0 prose-p:font-medium prose-p:leading-6 prose-li:my-0.5 prose-li:font-medium prose-strong:font-bold prose-headings:font-bold prose-headings:my-2 prose-headings:first:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-");
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-black/10 px-1.5 py-0.5 text-sm font-mono dark:bg-white/10"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});
