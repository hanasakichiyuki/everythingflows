import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSearchIndex } from "@/lib/api/posts";
import { SEARCH_INDEX_CACHE_TAG } from "@/lib/cache-tags";

const getCachedSearchIndex = unstable_cache(
  async () => getSearchIndex("zh"),
  ["public-search-index"],
  { revalidate: 3600, tags: [SEARCH_INDEX_CACHE_TAG] },
);

export async function GET() {
  try {
    return NextResponse.json({ items: await getCachedSearchIndex() });
  } catch {
    return NextResponse.json({ error: "搜索索引暂时不可用" }, { status: 503 });
  }
}
