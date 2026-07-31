"use client";

import { Link } from "@/i18n/navigation";
import type { PostMeta } from "@/types";

type YearGroup = {
  year: number;
  posts: PostMeta[];
};

type Props = {
  archive: YearGroup[];
  postsLabel: string;
};

function formatDay(date: string) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  return day;
}

function groupByMonth(posts: PostMeta[]) {
  const groups = new Map<number, PostMeta[]>();
  for (const post of posts) {
    const month = new Date(post.date).getMonth() + 1;
    groups.set(month, [...(groups.get(month) ?? []), post]);
  }
  return Array.from(groups.entries()).map(([month, monthPosts]) => ({ month, posts: monthPosts }));
}

export function ArchiveTimeline({ archive, postsLabel }: Props) {
  return (
    <div className="space-y-10">
      {archive.map(({ year, posts }, index) => (
        <section
          key={year}
          className="anim-fade-up"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          {/* Year header */}
          <div className="mb-5 flex items-center gap-3">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground">{year}</h2>
            <span className="h-2 w-2 rounded-full bg-primary/60" aria-hidden />
            <span className="text-sm text-muted">
              {posts.length} {postsLabel}
            </span>
          </div>

          <div className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-2 top-2 bottom-2 w-px bg-border sm:left-3"
              aria-hidden
            />
            <div className="space-y-6">
              {groupByMonth(posts).map(({ month, posts: monthPosts }) => (
                <section key={month} aria-label={`${month} 月`}>
                  <h3 className="mb-2 text-sm font-semibold text-primary">{month} 月</h3>
                  <ul className="space-y-1">
                    {monthPosts.map((post) => (
                      <li key={post.slug}>
                        <Link
                          href={`/blog/${encodeURIComponent(post.slug)}`}
                          className="group relative grid min-h-12 grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-4 rounded-xl px-3 py-2 transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
                        >
                          <span className="fine-pointer-group-hover absolute -left-[1.52rem] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-background bg-primary transition-transform group-hover:scale-125 sm:-left-[1.78rem]" aria-hidden />
                          <time className="text-right text-sm tabular-nums text-muted" dateTime={post.date}>{formatDay(post.date)} 日</time>
                          <span className="truncate text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">{post.title}</span>
                          {post.tags.length > 0 && <span className="hidden max-w-52 truncate text-xs text-muted sm:block">{post.tags.slice(0, 3).map((tag) => `#${tag}`).join(" · ")}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
