import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArchiveByYear } from "@/lib/api/posts";
import { ArchiveView } from "@/components/archive/ArchiveView";
import { PageCanvas } from "@/components/ui/surface";
import { EmptyState } from "@/components/ui/EmptyState";

// ISR：归档随发文变化；1h 兜底，发布/删除时由 server action revalidate。
// 登录态切换（管理视图）已移到客户端 ArchiveView，故无需服务端读 cookie。
export const revalidate = 3600;

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("archive");
  const archive = await getArchiveByYear(locale);

  return (
    <PageCanvas>
      <section aria-labelledby="archive-page-title">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <div className="mt-3 border-b border-border pb-7">
          <h1 id="archive-page-title" className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{t("subtitle")}</p>
        </div>
        <div className="mt-8">
          {archive.length === 0 ? (
            <EmptyState title={t("empty")} description={t("emptyDescription")} />
          ) : (
            <ArchiveView archive={archive} postsLabel={t("posts")} />
          )}
        </div>
      </section>
    </PageCanvas>
  );
}
