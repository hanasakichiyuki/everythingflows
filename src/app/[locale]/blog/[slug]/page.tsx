import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPost, listPostSlugs, getAdjacentPosts } from "@/lib/api/posts";
import type { PostMeta } from "@/types";
import { PostContent } from "@/components/blog/PostContent";
import { PostNavigation } from "@/components/blog/PostNavigation";
import { GiscusComments } from "@/components/comments/GiscusComments";
import { formatDate } from "@/lib/utils";
import { ContentCard } from "@/components/layout/ContentCard";
import { EditPostButton } from "@/components/blog/EditPostButton";
import { BackButton } from "@/components/blog/BackButton";
import { siteConfig } from "@/config/site";

// ISR: blog content changes rarely; revalidate hourly and on publish/edit.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let post = null;
  try {
    post = await getPost(decodeURIComponent(slug));
  } catch {
    post = null;
  }
  if (!post) {
    return { title: "未找到文章" };
  }

  // localePrefix is "never" → public URLs carry no locale segment.
  const url = `${siteConfig.url}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export async function generateStaticParams() {
  try {
    const slugs = await listPostSlugs("zh");
    return slugs.map((slug) => ({ locale: "zh", slug }));
  } catch {
    return [];
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let post;
  let prev: PostMeta | null = null;
  let next: PostMeta | null = null;
  try {
    const decodedSlug = decodeURIComponent(slug);
    post = await getPost(decodedSlug);
    if (post) {
      const adjacent = await getAdjacentPosts(post.slug, locale);
      prev = adjacent.prev;
      next = adjacent.next;
    }
  } catch (e) {
    console.error("Failed to fetch post:", e);
    notFound();
  }
  if (!post) notFound();

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
          <EditPostButton postId={post.id!} />
          </div>
        </header>
        <PostContent
          content={post.content}
          contentJson={post.contentJson}
          contentFormat={post.contentFormat}
        />
        <PostNavigation prev={prev} next={next} />
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">{t("comments")}</h2>
          <GiscusComments />
        </section>
      </article>
    </ContentCard>
  );
}
