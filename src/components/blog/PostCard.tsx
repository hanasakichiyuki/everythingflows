import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import type { PostMeta } from "@/types";
import { ArrowUpRight, Clock3, Folder, Tag } from "lucide-react";

export function PostCard({ post, index = 0 }: { post: PostMeta; index?: number }) {
  return (
    <article className={`anim-fade-up anim-delay-${Math.min(index + 1, 6)} group`}>
      <Link
        href={`/blog/${encodeURIComponent(post.slug)}`}
        className="block rounded-2xl border border-surface-border bg-surface px-5 py-5 shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_42px_-32px_rgba(25,74,91,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <time dateTime={post.date}>{formatDate(post.date, "zh-CN")}</time>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{post.readingTime}</span>
              {post.category && <span className="inline-flex items-center gap-1"><Folder className="h-3.5 w-3.5" />{post.category}</span>}
            </div>
            <h2 className="mt-3 font-serif text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">{post.title}</h2>
            <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted">{post.description}</p>
          </div>
          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted/60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary">
            <Tag className="h-3.5 w-3.5 text-muted" aria-hidden />
            {post.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-primary-soft px-2.5 py-1">#{tag}</span>)}
          </div>
        )}
      </Link>
    </article>
  );
}
