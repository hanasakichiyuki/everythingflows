"use client";

import { useEffect, useRef } from "react";

export function HtmlContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = content;
    }
  }, [content]);

  return <div ref={ref} className="prose-blog" />;
}