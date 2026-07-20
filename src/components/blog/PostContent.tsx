import { MdxContent } from "@/components/mdx/MdxContent";
import { HtmlContent } from "./HtmlContent";
import type { ContentFormat } from "@/types";
import type { TiptapDocument } from "@/lib/editor/types";
import { validateTiptapDocument } from "@/lib/editor/types";
import { tiptapDocumentToHtml } from "@/lib/editor/serialization";

type Props = {
  content: string;
  contentJson?: TiptapDocument | null;
  contentFormat?: ContentFormat;
};

/**
 * Server component — renders the post body into the initial HTML.
 * HTML posts are sanitized server-side; MDX posts use next-mdx-remote/rsc.
 */
export function PostContent({
  content,
  contentJson,
  contentFormat = "mdx",
}: Props) {
  if (contentFormat === "html") {
    return <HtmlContent content={content} />;
  }

  if (contentFormat === "tiptap") {
    const result = validateTiptapDocument(contentJson);
    if (!result.success) {
      return (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          文章内容暂时无法显示。
        </p>
      );
    }
    return <HtmlContent content={tiptapDocumentToHtml(result.data)} />;
  }

  return <MdxContent source={content} />;
}
