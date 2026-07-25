import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPostsByTag } from "@/lib/api/posts";
import { PostCard } from "@/components/blog/PostCard";
import { PageCanvas } from "@/components/ui/surface";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 3600;

export default async function TagPage({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag } = await params;
  setRequestLocale(locale);
  const decoded = decodeURIComponent(tag);
  const [posts, t] = await Promise.all([getPostsByTag(decoded, locale), getTranslations("blog")]);

  return (
    <PageCanvas>
      <section aria-labelledby="tag-page-title">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("tags")}</p>
        <h1 id="tag-page-title" className="mt-3 font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">#{decoded}</h1>
        <p className="mb-9 mt-3 text-sm leading-7 text-muted sm:text-[15px]">{t("postCount", { count: posts.length })}</p>
        {posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post, index) => (
              <PostCard key={post.slug} post={post} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("tagEmptyTitle")} description={t("tagEmptyDescription")} />
        )}
      </section>
    </PageCanvas>
  );
}
