import { listFragments as listSupabaseFragments } from "./supabase/fragments";
import type { MemoryFragment } from "@/types/memory";

export async function listFragments(limit?: number): Promise<MemoryFragment[]> {
  return listSupabaseFragments(limit);
}
