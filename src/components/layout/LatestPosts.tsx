import { Link } from "@/i18n/routing";
import type { PostMeta } from "@/types";

interface LatestPostsProps {
  posts: PostMeta[];
}

function formatMonthDay(date: string) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function LatestPosts({ posts }: LatestPostsProps) {
  const displayPosts = posts.slice(0, 5);

  return (
    <div
      className="anim-fade-up relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 shadow-lg dark:border-white/10 dark:bg-gray-900/50"
    >
      <div className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-gray-900/30 pointer-events-none" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground/90 dark:text-foreground">
            Latest Posts
            <span className="ml-2 text-pink-500">•</span>
          </h3>
          <Link
            href="/archive"
            className="text-xs text-muted transition-colors hover:text-pink-500"
          >
            查看全部 →
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col justify-evenly pl-8">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[2.125rem] top-2 bottom-2 w-px border-l border-dashed border-pink-300/25"
            aria-hidden
          />

          {displayPosts.map((post, index) => (
            <article
              key={post.slug}
              className={`anim-fade-up anim-delay-${index + 1} group cursor-pointer`}
            >
              <Link
                href={`/blog/${encodeURIComponent(post.slug)}`}
                className="group relative grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-pink-100/50 dark:hover:bg-pink-900/20"
              >
                {/* Timeline dot */}
                <span
                  className="absolute -left-[1.625rem] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-pink-400/40 transition-all duration-200 group-hover:h-5 group-hover:w-0.5 group-hover:rounded-sm group-hover:bg-pink-400"
                  aria-hidden
                />

                {/* Date */}
                <time
                  className="text-right text-sm tabular-nums text-muted/60 transition-colors group-hover:text-foreground/80"
                  dateTime={post.date}
                >
                  {formatMonthDay(post.date)}
                </time>

                {/* Title + description */}
                <div className="min-w-0">
                  <h4 className="text-[15px] font-medium leading-snug text-foreground/75 transition-all duration-200 group-hover:text-pink-500 group-hover:pl-2 truncate">
                    {post.title}
                  </h4>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-muted/60 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="hidden max-w-[160px] flex-wrap justify-end gap-x-1 gap-y-0.5 text-xs text-pink-400/50 sm:flex">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="shrink-0">
                        #{tag}
                      </span>
                    ))}
                    {post.tags.length > 2 && (
                      <span className="text-muted/40">…</span>
                    )}
                  </div>
                )}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
