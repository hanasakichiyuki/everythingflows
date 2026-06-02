"use client";

import dynamic from "next/dynamic";

const HtmlContentInner = dynamic(
  () => import("./HtmlContent").then((m) => ({ default: m.HtmlContent })),
  {
    ssr: false,
    loading: () => <div className="prose-blog" />,
  }
);

export function HtmlContentClient({ content }: { content: string }) {
  return <HtmlContentInner content={content} />;
}