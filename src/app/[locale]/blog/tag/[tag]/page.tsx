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
      <div className="space-y-8">
        <p className="text-sm text-muted">{t("postCount", { count: posts.length })}</p>
        {posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post, index) => (
              <PostCard key={post.slug} post={post} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("tagEmptyTitle")} description={t("tagEmptyDescription")} />
        )}
      </div>
    </PageCanvas>
  );
}
