import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { MdxContent } from "@/components/mdx/MdxContent";
import { ContentCard } from "@/components/layout/ContentCard";

function getAboutContent() {
  return `

欢迎来到 **${siteConfig.name}** — ${siteConfig.description}。

这里记录思考、技术与生活。站点基于 Next.js 构建，无后端运行。

## 技术栈

- 前端：Next.js 14 · React 18 · Tailwind · TypeScript
- 内容：MDX 文件系统（可切换 Supabase）
- 评论：Giscus（GitHub Discussions）
- 部署：Vercel · 域名 everythingflows.net
`;
}

export default async function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
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
