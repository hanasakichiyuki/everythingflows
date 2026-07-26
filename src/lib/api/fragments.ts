import {
  getFragment as getSupabaseFragment,
  listFragments as listSupabaseFragments,
} from "./supabase/fragments";
import type { MemoryFragment } from "@/types/memory";
import { deletePostImage } from "./media";

export async function listFragments(limit?: number): Promise<MemoryFragment[]> {
  return listSupabaseFragments(limit);
}

export async function getFragment(id: string): Promise<MemoryFragment | null> {
  return getSupabaseFragment(id);
}

export async function deleteFragmentImage(url: string): Promise<void> {
  return deletePostImage(url);
}
