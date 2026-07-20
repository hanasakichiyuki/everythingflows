import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PostEditor } from "@/components/admin/PostEditor";
import { isSupabaseMode } from "@/lib/api/posts";
import { getPostById } from "@/lib/api/posts";
import { createClient } from "@/lib/supabase/server-client";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

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
    <AdminWorkspaceShell email={user.email} mode="edit">
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
          contentJson: post.contentJson,
          contentFormat: post.contentFormat,
        }}
      />
    </AdminWorkspaceShell>
  );
}
