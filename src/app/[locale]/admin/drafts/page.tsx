import { setRequestLocale } from "next-intl/server";
import { listPostsAdmin } from "@/lib/api/posts";
import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
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
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <FileText className="h-3.5 w-3.5" />
                写作工作台
              </span>
              <h2 id="drafts-title" className="mt-2 text-2xl font-semibold tracking-tight">草稿箱</h2>
              <p className="mt-1.5 text-sm text-muted">
                {drafts.length} 篇未发布文章
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/admin"><PenLine className="h-3.5 w-3.5" />新建文章</Link>
            </Button>
          </div>

          {drafts.length === 0 ? (
            <EmptyState
              title="还没有草稿"
              description="第一篇文章会在首次保存后自动进入草稿箱。"
              icon={<FileText className="h-5 w-5" />}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">开始写作</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-[20px] border border-surface-border bg-surface">
              {drafts.map((post) => (
                <article
                  key={post.id}
                  className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-primary-soft/65 sm:px-5"
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
                  <div className="shrink-0 text-right">
                    <Badge variant="warning">草稿</Badge>
                    <time
                      dateTime={post.updated || post.date}
                      className="mt-1.5 block text-xs tabular-nums text-muted"
                    >
                      {format(new Date(post.updated || post.date), "yyyy-MM-dd")}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminWorkspaceShell>
  );
}
