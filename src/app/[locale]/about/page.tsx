import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { ContentCard } from "@/components/layout/ContentCard";

/**
 * About 页正文。
 *
 * 原先用 `MdxContent`（next-mdx-remote + remark-gfm + rehype-slug）渲染一段内联 Markdown，
 * 但内容只用到「粗体 + 空行分段」两个特性 —— 为它保留整条 MDX 依赖链并不划算。
 * 直接输出 JSX：仍然是服务端渲染（SEO/LCP 不变），DOM 与原先逐节点一致，且零依赖。
 */
function AboutContent() {
  return (
    <div className="prose-blog">
      <p>
        欢迎来到 <strong>{siteConfig.name}</strong> 。
      </p>
      <p>万物流转，源自古希腊哲学家赫拉克利特的理论。宇宙在一团永恒的火中燃尽又重生。</p>
      <p>当火舌绞成火结</p>
      <p>烈火与玫瑰合二为一时</p>
      <p>一切都会平安无事</p>
      <p>世界万物也平安无事</p>
    </div>
  );
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
        <AboutContent />
      </div>
    </ContentCard>
  );
}
