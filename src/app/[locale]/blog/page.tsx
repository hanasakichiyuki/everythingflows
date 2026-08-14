import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPosts } from "@/lib/api/posts";
import { BlogList } from "@/components/blog/BlogList";
import { PageCanvas } from "@/components/ui/surface";

export const revalidate = 3600;

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [posts, t] = await Promise.all([listPosts(locale), getTranslations("blog")]);

  return (
    <PageCanvas>
      <div className="space-y-8">
        <p className="text-sm text-muted">{t("postCount", { count: posts.length })}</p>
        <BlogList posts={posts} />
      </div>
    </PageCanvas>
  );
}
