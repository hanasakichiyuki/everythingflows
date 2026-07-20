import { getSupabasePublic } from "./client";
import type { MemoryFragment } from "@/types/memory";

const FRAGMENT_COLUMNS = "id,type,image_url,text,width,height,created_at";

function mapFragment(row: {
  id: string;
  type: "image" | "text";
  image_url: string | null;
  text: string | null;
  width: MemoryFragment["width"] | null;
  height: MemoryFragment["height"] | null;
  created_at: string;
}): MemoryFragment {
  return {
    id: row.id,
    type: row.type,
    imageUrl: row.image_url ?? undefined,
    text: row.text ?? undefined,
    width: row.width ?? "md",
    height: row.height ?? "medium",
    createdAt: row.created_at,
  };
}

export async function listFragments(limit?: number): Promise<MemoryFragment[]> {
  let query = getSupabasePublic()
    .from("fragments")
    .select(FRAGMENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapFragment(row as Parameters<typeof mapFragment>[0]));
}
