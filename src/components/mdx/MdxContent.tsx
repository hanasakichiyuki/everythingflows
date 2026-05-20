import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Bilibili } from "./Bilibili";

const components = {
  Bilibili,
  iframe: (props: React.IframeHTMLAttributes<HTMLIFrameElement>) => (
    <div className="my-6 aspect-video overflow-hidden rounded-xl">
      <iframe {...props} className="h-full w-full" />
    </div>
  ),
};

export function MdxContent({ source }: { source: string }) {
  return (
    <div className="prose-blog">
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug],
          },
        }}
      />
    </div>
  );
}
