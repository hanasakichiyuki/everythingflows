import { MdxContent } from "@/components/mdx/MdxContent";
import type { ContentFormat } from "@/types";
import DOMPurify from "isomorphic-dompurify";

type Props = {
  content: string;
  contentFormat?: ContentFormat;
};

export function PostContent({ content, contentFormat = "mdx" }: Props) {
  if (contentFormat === "html") {
    const safe = DOMPurify.sanitize(content, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "src", "title"],
    });
    return (
      <div
        className="prose-blog"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return <MdxContent source={content} />;
}
