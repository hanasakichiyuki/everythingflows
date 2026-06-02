import { setRequestLocale } from "next-intl/server";
import { getPostsByTag } from "@/lib/api/posts";
import { PostCard } from "@/components/blog/PostCard";

export const dynamic = "auto";

export default async function TagPage({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag } = await params;
  setRequestLocale(locale);
  const decoded = decodeURIComponent(tag);
  const posts = await getPostsByTag(decoded, locale);

  return (
    <section>
      <h1 className="mb-2 text-2xl font-bold">#{decoded}</h1>
      <p className="mb-8 text-sm text-muted">{posts.length} posts</p>
      <div>
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
