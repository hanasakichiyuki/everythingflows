import { setRequestLocale } from "next-intl/server";
import { listPosts } from "@/lib/api/posts";
import { HomePageContent } from "@/components/layout/HomePageContent";
import { listFragments } from "@/lib/api/fragments";

export const revalidate = 3600;

async function getHomeFragments() {
  try {
    return await listFragments(6);
  } catch {
    console.error("[home] unable to load fragments");
    return [];
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [posts, fragments] = await Promise.all([
    listPosts(locale),
    getHomeFragments(),
  ]);

  return <HomePageContent posts={posts} fragments={fragments} />;
}
