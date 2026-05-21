import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArchiveByYear } from "@/lib/api/posts";
import { ArchiveTimeline } from "@/components/archive/ArchiveTimeline";
import { ContentCard } from "@/components/layout/ContentCard";

export const dynamic =
  process.env.DATA_PROVIDER === "supabase" ? "force-dynamic" : undefined;

export default async function ArchivePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("archive");
  const archive = await getArchiveByYear(locale);

  return (
    <ContentCard>
      <h1 className="sr-only">{t("title")}</h1>
      {archive.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <ArchiveTimeline archive={archive} postsLabel={t("posts")} />
      )}
    </ContentCard>
  );
}
