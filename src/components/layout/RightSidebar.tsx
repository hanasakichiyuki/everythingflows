"use client";

import { DateTimeCard } from "./DateTimeCard";
import { LatestPosts } from "./LatestPosts";
import { Fragments } from "./Fragments";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";

interface RightSidebarProps {
  posts: PostMeta[];
  fragments: MemoryFragment[];
}

export function RightSidebar({ posts, fragments }: RightSidebarProps) {
  return (
    <aside className="relative z-10 w-[320px] shrink-0 space-y-6">
      <DateTimeCard />
      <LatestPosts posts={posts} />
      <Fragments fragments={fragments} />
    </aside>
  );
}
