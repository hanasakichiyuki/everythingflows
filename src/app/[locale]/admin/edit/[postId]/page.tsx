import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PostEditor } from "@/components/admin/PostEditor";
import { isSupabaseMode } from "@/lib/api/posts";
import { getPostById } from "@/lib/api/posts";
import { ContentCard } from "@/components/layout/ContentCard";
import { createClient } from "@/lib/supabase/server-client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ locale: string; postId: string }>;
}) {
  const { locale, postId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const post = await getPostById(postId);
  if (!post) notFound();

  return (
    <ContentCard>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">编辑文章</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              登出
            </Button>
          </form>
        </div>
      </div>
      <PostEditor
        locale={locale}
        supabaseMode={isSupabaseMode()}
        initialData={{
          id: post.id!,
          title: post.title,
          description: post.description,
          tags: post.tags,
          category: post.category,
          body: post.content,
        }}
      />
    </ContentCard>
  );
}
