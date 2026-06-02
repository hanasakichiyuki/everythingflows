import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { MdxContent } from "@/components/mdx/MdxContent";
import { ContentCard } from "@/components/layout/ContentCard";

function getAboutContent() {
  return `

欢迎来到 **${siteConfig.name}** 。

万物流转，源自古希腊哲学家赫拉克利特的理论。宇宙在一团永恒的火中燃尽又重生。

当火舌绞成火结

烈火与玫瑰合二为一时

一切都会平安无事

世界万物也平安无事

In my beginning is my end

In my end is my beginning

在互联网的幽暗角落，烧着属于我的火。


`;
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <ContentCard>
      <div className="font-serif font-medium leading-8 tracking-wide">
      <h1 className="mb-8 text-2xl font-bold">{t("title")}</h1>
      <MdxContent source={getAboutContent()} />
      </div>
    </ContentCard>
  );
}
