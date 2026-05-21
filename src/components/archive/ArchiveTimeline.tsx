import { Link } from "@/i18n/routing";
import type { PostMeta } from "@/types";

type YearGroup = {
  year: number;
  posts: PostMeta[];
};

type Props = {
  archive: YearGroup[];
  postsLabel: string;
};

function formatMonthDay(date: string) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function ArchiveTimeline({ archive, postsLabel }: Props) {
  return (
    <div className="space-y-10">
      {archive.map(({ year, posts }) => (
        <section key={year}>
          {/* Year header */}
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground/90">{year}</h2>
            <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-pink-300/60 bg-white/50" />
            </div>
            <span className="text-sm text-muted/70">
              {posts.length} {postsLabel}
            </span>
          </div>

          {/* Timeline list */}
          <div className="relative pl-8">
            {/* Vertical timeline line */}
            <div
              className="absolute left-[2.125rem] top-2 bottom-2 w-px border-l border-dashed border-pink-300/25"
              aria-hidden
            />

            <ul className="space-y-1">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${encodeURIComponent(post.slug)}`}
                    className="group relative grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4 gap-y-0.5 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-pink-100/50 dark:hover:bg-pink-900/20"
                  >
                    {/* Timeline dot / accent bar */}
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

                    {/* Title */}
                    <span className="min-w-0 text-[15px] font-medium leading-snug text-foreground/75 transition-all duration-200 group-hover:text-pink-500 group-hover:pl-4 truncate">
                      {post.title}
                    </span>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="hidden max-w-[200px] flex-wrap justify-end gap-x-1.5 gap-y-0.5 text-xs text-pink-400/60 sm:flex">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="shrink-0">
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="text-muted/50">…</span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
