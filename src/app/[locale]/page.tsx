import { setRequestLocale } from "next-intl/server";
import { listPosts } from "@/lib/api/posts";
import { HomePageContent } from "@/components/layout/HomePageContent";
import { listFragments } from "@/lib/api/fragments";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";

export const revalidate = 3600;

type HomeDataResult<T> = {
  items: T[];
  hasError: boolean;
};

async function getHomePosts(locale: string): Promise<HomeDataResult<PostMeta>> {
  try {
    return { items: await listPosts(locale), hasError: false };
  } catch {
    console.error("[home] unable to load posts");
    return { items: [], hasError: true };
  }
}

async function getHomeFragments(): Promise<HomeDataResult<MemoryFragment>> {
  try {
    return { items: await listFragments(6), hasError: false };
  } catch {
    console.error("[home] unable to load fragments");
    return { items: [], hasError: true };
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [postsResult, fragmentsResult] = await Promise.all([getHomePosts(locale), getHomeFragments()]);

  return (
    <HomePageContent
      posts={postsResult.items}
      fragments={fragmentsResult.items}
      postsUnavailable={postsResult.hasError}
      fragmentsUnavailable={fragmentsResult.hasError}
    />
  );
}
