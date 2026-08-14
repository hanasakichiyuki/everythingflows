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
      <div className="space-y-8">
        {archive.length === 0 ? (
          <EmptyState title={t("empty")} description={t("emptyDescription")} />
        ) : (
          <ArchiveView archive={archive} postsLabel={t("posts")} />
        )}
      </div>
    </PageCanvas>
  );
}
