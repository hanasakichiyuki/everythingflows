import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostEditor } from "@/components/admin/PostEditor";
import { isSupabaseMode } from "@/lib/api/posts";
import { ContentCard } from "@/components/layout/ContentCard";
import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/admin/drafts`}>草稿箱</Link>
          </Button>
          <span className="text-sm text-muted">{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              登出
            </Button>
          </form>
        </div>
      </div>
      <PostEditor locale={locale} supabaseMode={isSupabaseMode()} />
    </ContentCard>
  );
}
