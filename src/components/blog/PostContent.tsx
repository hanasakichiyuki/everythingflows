import { MdxContent } from "@/components/mdx/MdxContent";
import { HtmlContent } from "./HtmlContent";
import type { ContentFormat } from "@/types";

type Props = {
  content: string;
  contentFormat?: ContentFormat;
};

/**
 * Server component — renders the post body into the initial HTML.
 * HTML posts are sanitized server-side; MDX posts use next-mdx-remote/rsc.
 */
export function PostContent({ content, contentFormat = "mdx" }: Props) {
  if (contentFormat === "html") {
    return <HtmlContent content={content} />;
  }

  return <MdxContent source={content} />;
}
