import { setRequestLocale } from "next-intl/server";
import { getPostsByTag } from "@/lib/api/posts";
import { PostCard } from "@/components/blog/PostCard";
import { PageShell } from "@/components/ui/surface";

export const revalidate = 3600;

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
    <PageShell>
      <section aria-labelledby="tag-page-title">
        <h1 id="tag-page-title" className="mb-2 text-2xl font-bold">#{decoded}</h1>
        <p className="mb-8 text-sm text-muted">{posts.length} 篇文章</p>
        {posts.length > 0 ? (
          <div>
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted">这个标签下暂时没有文章</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
