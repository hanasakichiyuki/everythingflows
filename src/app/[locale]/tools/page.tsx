import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { futureTools } from "@/config/site";
import { ContentCard } from "@/components/layout/ContentCard";

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tools");

  return (
    <ContentCard>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-sm text-muted">
        工具模块预留目录：src/app/[locale]/tools/。后续可接入 OpenAI / Azure 等。
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {futureTools.map((tool) => (
          <li
            key={tool.id}
            className="rounded-xl border border-border p-5 opacity-80"
          >
            <h2 className="font-semibold">{t("fortune")}</h2>
            {!tool.enabled ? (
              <span className="mt-2 inline-block text-xs text-muted">{t("coming")}</span>
            ) : (
              <Link href={tool.href} className="mt-2 inline-block text-sm underline">
                进入
              </Link>
            )}
          </li>
        ))}
      </ul>
    </ContentCard>
  );
}
