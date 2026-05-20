import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { NavIcon } from "@/components/layout/NavIcon";

export default async function LinksPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("links");

  return (
    <section>
      <h1 className="mb-8 text-2xl font-bold">{t("title")}</h1>
      <ul className="space-y-4">
        {siteConfig.links.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <NavIcon name={link.icon === "github" ? "github" : "cat"} className="h-5 w-5" />
              <span className="font-medium">{link.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">
        在 site.config.json 的 links 数组中添加更多友链。
      </p>
    </section>
  );
}
