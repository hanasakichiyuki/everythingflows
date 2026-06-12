import DOMPurify from "isomorphic-dompurify";

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
function openExternalLinks(node: Element) {
  if (node.tagName === "A") {
    const href = node.getAttribute("href") ?? "";
    if (/^https?:\/\//.test(href)) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  }
}

function sanitize(content: string): string {
  DOMPurify.addHook("afterSanitizeAttributes", openExternalLinks);
  try {
    return DOMPurify.sanitize(content, { ADD_ATTR: ["target", "rel"] });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}

export function HtmlContent({ content }: { content: string }) {
  const clean = sanitize(content);
  return (
    <div
      className="prose-blog"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
