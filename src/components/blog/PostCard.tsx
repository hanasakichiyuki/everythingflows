import { Link } from "@/i18n/routing";
import { formatDate } from "@/lib/utils";
import type { PostMeta } from "@/types";

export function PostCard({ post, locale }: { post: PostMeta; locale: string }) {
  return (
    <article className="group border-b border-border py-6 last:border-0">
      <Link href={`/blog/${post.slug}`} className="block">
        <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-accent">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{post.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <time dateTime={post.date}>{formatDate(post.date, locale === "zh" ? "zh-CN" : "en-US")}</time>
          <span>{post.readingTime}</span>
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-black/5 px-2 py-0.5 dark:bg-white/10">
              #{tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}
