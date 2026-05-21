import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPosts } from "@/lib/api/posts";
import { PostCard } from "@/components/blog/PostCard";
import { ContentCard } from "@/components/layout/ContentCard";

export const dynamic =
  process.env.DATA_PROVIDER === "supabase" ? "force-dynamic" : undefined;

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  setRequestLocale(locale);
  const posts = await listPosts(locale);
  const t = await getTranslations("home");

  return (
    <ContentCard>
      <h1 className="mb-8 text-2xl font-bold">{t("latest")}</h1>
      {posts.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
      )}
    </ContentCard>
  );
}
