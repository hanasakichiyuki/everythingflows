"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";

export function HtmlContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = DOMPurify.sanitize(content);
    }
  }, [content]);

  return <div ref={ref} className="prose-blog" />;
}