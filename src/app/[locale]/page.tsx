import { setRequestLocale } from "next-intl/server";
import { listPosts } from "@/lib/api/posts";
import { HomePageContent } from "@/components/layout/HomePageContent";
import { MemoryFragment } from "@/types/memory";
import { seedFragments } from "@/data/seed-fragments";

export const dynamic = "force-dynamic";

async function getFragments(): Promise<MemoryFragment[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server-client");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fragments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Error fetching fragments:", error);
      return seedFragments.slice(0, 6);
    }

    return data.map((item) => ({
      id: item.id,
      type: item.type as "image" | "text",
      imageUrl: item.image_url || undefined,
      text: item.text || undefined,
      width: (item.width as MemoryFragment["width"]) || "md",
      height: (item.height as MemoryFragment["height"]) || "medium",
      createdAt: item.created_at,
    }));
  } catch {
    return seedFragments.slice(0, 6);
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = await listPosts(locale);
  const fragments = await getFragments();

  return <HomePageContent posts={posts} fragments={fragments} />;
}
