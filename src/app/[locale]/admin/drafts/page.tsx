import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPostsAdmin } from "@/lib/api/posts";
import { ContentCard } from "@/components/layout/ContentCard";
import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

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
    <ContentCard>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">草稿箱</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/admin`}>返回</Link>
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-center text-muted">暂无草稿</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <Link
                href={`/${locale}/admin/edit/${post.id}`}
                className="truncate font-medium hover:text-accent"
              >
                {post.title}
              </Link>
              <span className="shrink-0 text-xs text-muted">
                {format(new Date(post.updated || post.date), "yyyy-MM-dd")}
              </span>
            </div>
          ))}
        </div>
      )}
    </ContentCard>
  );
}
