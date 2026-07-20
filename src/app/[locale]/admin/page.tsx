import { setRequestLocale } from "next-intl/server";
import { PostEditor } from "@/components/admin/PostEditor";
import { isSupabaseMode } from "@/lib/api/posts";
import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function AdminPage({
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

  return (
    <AdminWorkspaceShell email={user.email} mode="create">
      <PostEditor locale={locale} supabaseMode={isSupabaseMode()} />
    </AdminWorkspaceShell>
  );
}
