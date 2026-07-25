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
      <section aria-labelledby="blog-page-title">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <div className="mt-3 flex flex-col gap-2 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="blog-page-title" className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">{t("subtitle")}</p>
          </div>
          <p className="text-sm text-muted">{t("postCount", { count: posts.length })}</p>
        </div>
        <div className="mt-7">
          <BlogList posts={posts} />
        </div>
      </section>
    </PageCanvas>
  );
}
