import { setRequestLocale } from "next-intl/server";
import { listPostsAdmin } from "@/lib/api/posts";
import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function DraftsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const posts = await listPostsAdmin(locale);
  const drafts = posts.filter((p) => !p.published);

  return (
    <AdminWorkspaceShell email={user.email} mode="drafts">
      <section
        className="min-h-[calc(100vh-4.5rem)] overflow-y-auto px-5 py-6 sm:px-8 lg:h-[calc(100vh-4.5rem)] lg:min-h-0"
        aria-labelledby="drafts-title"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="drafts-title" className="text-xl font-semibold tracking-tight">草稿箱</h2>
              <p className="mt-1 text-sm text-muted">
                {drafts.length} 篇未发布文章
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/admin">新建文章</Link>
            </Button>
          </div>

          {drafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-20 text-center">
              <p className="text-sm text-muted">暂无草稿</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/admin">开始写作</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((post) => (
                <article
                  key={post.id}
                  className="group flex items-center gap-4 rounded-xl border border-border/70 bg-background/45 px-4 py-3 transition-colors hover:border-primary hover:bg-primary-soft"
                >
                  <Link
                    href={`/admin/edit/${post.id}`}
                    className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                      {post.title || "未命名文章"}
                    </h3>
                    {post.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted">
                        {post.description}
                      </p>
                    )}
                  </Link>
                  <time
                    dateTime={post.updated || post.date}
                    className="shrink-0 text-xs tabular-nums text-muted"
                  >
                    {format(new Date(post.updated || post.date), "yyyy-MM-dd")}
                  </time>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminWorkspaceShell>
  );
}
