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
import { PageShell } from "@/components/ui/surface";
import { EditPostButton } from "@/components/blog/EditPostButton";
import { BackButton } from "@/components/blog/BackButton";
import { siteConfig } from "@/config/site";
import { CalendarDays, Clock3, Folder, Tag } from "lucide-react";

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
    <PageShell surfaceClassName="mx-auto max-w-[46rem] px-5 py-7 sm:px-10 sm:py-11">
      <article>
        <header className="mb-9 border-b border-border pb-8">
          <BackButton />
          <div className="mt-6 flex items-start justify-between gap-5">
            <div className="min-w-0">
              {post.category && (
                <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  <Folder className="h-3.5 w-3.5" />
                  {post.category}
                </p>
              )}
              <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">{post.title}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                <time className="inline-flex items-center gap-1.5" dateTime={post.date}>
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(post.date)}
                </time>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{post.readingTime}</span>
                {post.updated && post.updated !== post.date && <span>{t("updated", { date: formatDate(post.updated) })}</span>}
              </div>
              {post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog/tag/${encodeURIComponent(tag)}`}
                      className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <div className="mx-auto max-w-[42rem]">
          <PostContent
            content={post.content}
            contentJson={post.contentJson}
            contentFormat={post.contentFormat}
          />
        </div>
        <PostNavigation prev={prev} next={next} />
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="font-serif text-xl font-semibold">{t("comments")}</h2>
          <GiscusComments />
        </section>
      </article>
    </PageShell>
  );
}
