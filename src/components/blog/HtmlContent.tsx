import DOMPurify from "isomorphic-dompurify";
import hljs from "highlight.js";
import { CodeBlockEnhancer } from "./CodeBlockEnhancer";
import { getPostImageSource, isManagedPostImageUrl } from "@/lib/post-image-proxy";

/**
 * Server-rendered HTML content.
 *
 * Sanitizes on the server and outputs into the initial HTML, so the article
 * body is present for crawlers and counts as a real LCP element (no client
 * `innerHTML` injection / hydration delay).
 *
 * External links get target/rel rewritten at sanitize time. The hook is
 * registered and removed around each (synchronous) sanitize call so it never
 * accumulates on the shared DOMPurify singleton (e.g. across HMR reloads).
 */
const BILIBILI_SANDBOX =
  "allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox";
const BILIBILI_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
const MAX_HIGHLIGHT_CHARS = 50_000;

function highlightCodeBlock(currentNode: Node) {
  if (currentNode.nodeType !== 1) return;
  const node = currentNode as Element;
  if (node.tagName !== "CODE" || node.parentElement?.tagName !== "PRE") return;

  const source = node.textContent ?? "";
  node.classList.add("hljs");
  if (!source || source.length > MAX_HIGHLIGHT_CHARS) return;

  const languageClass = [...node.classList].find((className) =>
    className.startsWith("language-")
  );
  const requestedLanguage = languageClass?.slice("language-".length);

  try {
    const result =
      requestedLanguage && hljs.getLanguage(requestedLanguage)
        ? hljs.highlight(source, {
            language: requestedLanguage,
            ignoreIllegals: true,
          })
        : hljs.highlightAuto(source);
    node.innerHTML = result.value;
    if (!languageClass && result.language) {
      node.classList.add(`language-${result.language}`);
    }
  } catch {
    // Keep the escaped plain text when a language grammar cannot parse it.
  }
}

function secureRenderedAttributes(node: Element) {
  if (node.tagName === "IMG") {
    const src = node.getAttribute("src") ?? "";
    if (!isManagedPostImageUrl(src)) {
      node.remove();
      return;
    }
    node.setAttribute("src", getPostImageSource(src));
    node.setAttribute("loading", "lazy");
    node.setAttribute("decoding", "async");
    node.setAttribute("referrerpolicy", "no-referrer");
  }

  if (node.tagName === "A") {
    const href = node.getAttribute("href") ?? "";
    if (/^https?:\/\//.test(href)) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  }

  if (node.tagName === "IFRAME") {
    const src = node.getAttribute("src") ?? "";
    let isAllowed = false;
    try {
      const url = new URL(src);
      isAllowed =
        url.protocol === "https:" &&
        url.hostname === "player.bilibili.com" &&
        url.pathname === "/player.html";
    } catch {
      isAllowed = false;
    }

    if (!isAllowed) {
      node.remove();
      return;
    }

    node.setAttribute("title", "Bilibili video");
    node.setAttribute("loading", "lazy");
    node.setAttribute("sandbox", BILIBILI_SANDBOX);
    node.setAttribute("allow", BILIBILI_ALLOW);
    node.setAttribute("allowfullscreen", "true");
    node.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  }
}

export function sanitizeHtmlContent(content: string): string {
  DOMPurify.addHook("beforeSanitizeElements", highlightCodeBlock);
  DOMPurify.addHook("afterSanitizeAttributes", secureRenderedAttributes);
  try {
    return DOMPurify.sanitize(content, {
      ADD_TAGS: ["iframe", "aside"],
      ADD_ATTR: [
        "target",
        "rel",
        "allow",
        "allowfullscreen",
        "sandbox",
        "loading",
        "referrerpolicy",
        "data-bilibili-embed",
        "data-bvid",
        "data-aid",
        "data-cid",
        "data-page",
        "data-autoplay",
        "data-callout-type",
        "decoding",
      ],
    });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
    DOMPurify.removeHook("beforeSanitizeElements");
  }
}

export function HtmlContent({ content }: { content: string }) {
  const clean = sanitizeHtmlContent(content);
  return (
    <>
      <div
        className="prose-blog"
        data-rich-content
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      <CodeBlockEnhancer />
    </>
  );
}
