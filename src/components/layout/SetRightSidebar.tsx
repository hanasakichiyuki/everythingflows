"use client";

import { useEffect } from "react";
import { useSetRightSidebar } from "./RightSidebarContext";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";

interface SetRightSidebarProps {
  posts: PostMeta[];
  fragments: MemoryFragment[];
  children: React.ReactNode;
}

export function SetRightSidebar({ posts, fragments, children }: SetRightSidebarProps) {
  const setRightSidebar = useSetRightSidebar();

  useEffect(() => {
    if (setRightSidebar) {
      setRightSidebar({ posts, fragments });
    }
  }, [posts, fragments, setRightSidebar]);

  return <>{children}</>;
}
