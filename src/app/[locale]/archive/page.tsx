import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArchiveByYear } from "@/lib/api/posts";
import { ArchiveTimeline } from "@/components/archive/ArchiveTimeline";
import { AdminArchiveTimeline } from "@/components/archive/AdminArchiveTimeline";
import { ContentCard } from "@/components/layout/ContentCard";
import { createClient } from "@/lib/supabase/server-client";

export const dynamic = "auto";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("archive");
  const archive = await getArchiveByYear(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ContentCard>
      <h1 className="sr-only">{t("title")}</h1>
      {archive.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : user ? (
        <AdminArchiveTimeline archive={archive} postsLabel={t("posts")} />
      ) : (
        <ArchiveTimeline archive={archive} postsLabel={t("posts")} />
      )}
    </ContentCard>
  );
}
