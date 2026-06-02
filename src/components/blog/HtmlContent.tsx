"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";

export function HtmlContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = DOMPurify.sanitize(content);
      // Add target="_blank" to external links
      ref.current.querySelectorAll('a[href^="http"]').forEach((link) => {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
    }
  }, [content]);

  return <div ref={ref} className="prose-blog" />;
}