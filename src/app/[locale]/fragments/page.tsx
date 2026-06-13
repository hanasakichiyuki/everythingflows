import { MemoryFragment } from "@/types/memory";
import { MemoryWall } from "@/components/memory/MemoryWall";
import { seedFragments } from "@/data/seed-fragments";
import { getSupabasePublic } from "@/lib/api/supabase/client";

// ISR：碎碎念变更频率低；1h 兜底，增删改时由 API 路由精确 revalidate。
export const revalidate = 3600;

async function getFragments(): Promise<MemoryFragment[]> {
  try {
    const supabase = getSupabasePublic();
    const { data, error } = await supabase
      .from("fragments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching fragments:", error);
      return seedFragments;
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
    return seedFragments;
  }
}

export default async function FragmentsPage() {
  const fragments = await getFragments();

  return <MemoryWall fragments={fragments} />;
}
