import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostEditor } from "@/components/admin/PostEditor";
import { isSupabaseMode } from "@/lib/api/posts";
import { ContentCard } from "@/components/layout/ContentCard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    <ContentCard>
      <h1 className="mb-8 text-2xl font-bold">{t("title")}</h1>
      <PostEditor locale={locale} supabaseMode={isSupabaseMode()} />
    </ContentCard>
  );
}
