import { ArrowRight, Bookmark, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PostMeta } from "@/types";
import { Surface } from "@/components/ui/surface";

interface LatestPostsProps {
  posts: PostMeta[];
  unavailable?: boolean;
}

function formatMonthDay(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export async function LatestPosts({ posts, unavailable = false }: LatestPostsProps) {
  const t = await getTranslations("home");
  const displayPosts = posts.slice(0, 5);

  return (
    <Surface className="anim-fade-up p-5 sm:p-6" contentClassName="flex flex-col" tone="solid" overlay={false}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-lg font-semibold text-foreground">{t("latest")}</h3>
        </div>
        <Link href="/archive" className="group -mr-2 inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary transition-[background-color,color] hover:bg-primary-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("viewAll")}
          <ArrowRight className="fine-pointer-group-hover h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {displayPosts.length > 0 ? (
        <div className="divide-y divide-border">
          {displayPosts.map((post, index) => (
            <article key={post.slug} className={`anim-fade-up anim-delay-${index + 1}`}>
              <Link
                href={`/blog/${encodeURIComponent(post.slug)}`}
                className="group grid min-h-[5.25rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_7rem_1.5rem] sm:px-3"
              >
                <div className="min-w-0">
                  <h4 className="truncate font-serif text-[15px] font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
                    {post.title}
                  </h4>
                  <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted">{post.description}</p>
                </div>
                <div className="text-right text-[11px] leading-5 text-muted">
                  <time className="block" dateTime={post.date}>{formatMonthDay(post.date)}</time>
                  <span className="hidden sm:block">{post.readingTime}</span>
                </div>
                <Bookmark className="hidden h-4 w-4 text-muted/55 transition-colors group-hover:text-accent sm:block" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-border px-4 text-center">
          <p className="text-sm text-muted">{unavailable ? t("postsUnavailable") : t("empty")}</p>
        </div>
      )}
    </Surface>
  );
}
