import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPost, listPostSlugs, getAdjacentPosts } from "@/lib/api/posts";
import { PostContent } from "@/components/blog/PostContent";
import { PostNavigation } from "@/components/blog/PostNavigation";
import { GiscusComments } from "@/components/comments/GiscusComments";
import { formatDate } from "@/lib/utils";
import { ContentCard } from "@/components/layout/ContentCard";
import { createClient } from "@/lib/supabase/server-client";
import { EditPostButton } from "@/components/blog/EditPostButton";
import { BackButton } from "@/components/blog/BackButton";

export const dynamic = "auto";

export async function generateStaticParams() {
  if (process.env.DATA_PROVIDER === "supabase") return [];
  const slugs = await listPostSlugs("zh");
  return slugs.map((slug) => ({ locale: "zh", slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let post;
  try {
    const decodedSlug = decodeURIComponent(slug);
    post = await getPost(decodedSlug);
  } catch (e) {
    console.error("Failed to fetch post:", e);
    notFound();
  }
  if (!post) notFound();

  const { prev, next } = await getAdjacentPosts(post.slug, locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("blog");

  return (
    <ContentCard>
      <article>
        <header className="mb-8 border-b border-border pb-6">
          <BackButton />
          <div className="mt-3 flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{post.title}</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
              <time dateTime={post.date}>
                {formatDate(post.date)}
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
            </div>
          {user && <EditPostButton postId={post.id!} />}
          </div>
        </header>
        <PostContent content={post.content} contentFormat={post.contentFormat} />
        <PostNavigation prev={prev} next={next} />
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">{t("comments")}</h2>
          <GiscusComments />
        </section>
      </article>
    </ContentCard>
  );
}
