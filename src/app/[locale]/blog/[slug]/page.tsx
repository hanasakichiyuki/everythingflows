import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPost, listPostSlugs } from "@/lib/api/posts";
import { PostContent } from "@/components/blog/PostContent";
import { GiscusComments } from "@/components/comments/GiscusComments";
import { formatDate } from "@/lib/utils";

import { routing } from "@/i18n/routing";

export const dynamic =
  process.env.DATA_PROVIDER === "supabase" ? "force-dynamic" : undefined;

export async function generateStaticParams() {
  if (process.env.DATA_PROVIDER === "supabase") return [];
  const pairs = await Promise.all(
    routing.locales.map(async (locale) => {
      const slugs = await listPostSlugs(locale);
      return slugs.map((slug) => ({ locale, slug }));
    })
  );
  return pairs.flat();
}

export default async function BlogPostPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const { locale, slug } = params;
  setRequestLocale(locale);
  const post = await getPost(slug);
  if (!post) notFound();

  const t = await getTranslations("blog");

  return (
    <article>
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
          <time dateTime={post.date}>
            {formatDate(post.date, locale === "zh" ? "zh-CN" : "en-US")}
          </time>
          <span>{post.readingTime}</span>
          {post.category && (
            <span>
              {t("category")}: {post.category}
            </span>
          )}
        </div>
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/tag/${encodeURIComponent(tag)}`}
                className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>
      <PostContent content={post.content} contentFormat={post.contentFormat} />
      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">{t("comments")}</h2>
        <GiscusComments />
      </section>
    </article>
  );
}
