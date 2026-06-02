"use client";

import dynamic from "next/dynamic";
import { MdxContent } from "@/components/mdx/MdxContent";
import type { ContentFormat } from "@/types";

const HtmlContent = dynamic(() => import("./HtmlContent").then((m) => ({ default: m.HtmlContent })), {
  ssr: false,
  loading: () => <div className="prose-blog" />,
});

type Props = {
  content: string;
  contentFormat?: ContentFormat;
};

export function PostContent({ content, contentFormat = "mdx" }: Props) {
  if (contentFormat === "html") {
    return <HtmlContent content={content} />;
  }

  return <MdxContent source={content} />;
}
