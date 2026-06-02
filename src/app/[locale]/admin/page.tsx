import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostEditor } from "@/components/admin/PostEditor";
import { isSupabaseMode } from "@/lib/api/posts";
import { ContentCard } from "@/components/layout/ContentCard";
import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ContentCard>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/admin/drafts`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent/10"
          >
            草稿箱
          </Link>
          <span className="text-sm text-muted">{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-pink-100/50 hover:text-pink-500 dark:hover:bg-pink-900/20">
              登出
            </button>
          </form>
        </div>
      </div>
      <PostEditor locale={locale} supabaseMode={isSupabaseMode()} />
    </ContentCard>
  );
}
