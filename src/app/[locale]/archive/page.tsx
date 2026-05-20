import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getArchiveByYear } from "@/lib/api/posts";
import { formatDate } from "@/lib/utils";
import type { PostMeta } from "@/types";

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
    <section>
      <h1 className="mb-8 text-2xl font-bold">{t("title")}</h1>
      <div className="space-y-10">
        {archive.map(({ year, posts }) => (
          <div key={year}>
            <h2 className="mb-4 text-lg font-semibold text-muted">{year}</h2>
            <ul className="space-y-2">
              {posts.map((post: PostMeta) => (
                <li key={post.slug} className="flex items-baseline gap-4 text-sm">
                  <time className="w-24 shrink-0 text-muted" dateTime={post.date}>
                    {formatDate(post.date, locale === "zh" ? "zh-CN" : "en-US")}
                  </time>
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              {posts.length} {t("posts")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
