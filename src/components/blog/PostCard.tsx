import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import type { PostMeta } from "@/types";
import { ArrowUpRight, Clock3, Folder, Tag } from "lucide-react";

export function PostCard({ post, index = 0 }: { post: PostMeta; index?: number }) {
  return (
    <article className={`anim-fade-up anim-delay-${Math.min(index + 1, 6)} group h-full`}>
      <Link
        href={`/blog/${encodeURIComponent(post.slug)}`}
        className="flex h-full min-h-[15rem] flex-col rounded-surface border border-surface-border bg-background/95 p-5 shadow-[0_18px_48px_-34px_rgba(25,74,91,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <time dateTime={post.date}>{formatDate(post.date, "zh-CN")}</time>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{post.readingTime}</span>
              {post.category && <span className="inline-flex items-center gap-1"><Folder className="h-3.5 w-3.5" />{post.category}</span>}
            </div>
            <h2 className="mt-4 font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.7rem]">{post.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted sm:text-[15px] sm:leading-7">{post.description}</p>
          </div>
          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted/60" />
        </div>
        {post.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-7 text-xs text-primary">
            <Tag className="h-3.5 w-3.5 text-muted" aria-hidden />
            {post.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-primary-soft px-2.5 py-1">#{tag}</span>)}
          </div>
        )}
      </Link>
    </article>
  );
}
