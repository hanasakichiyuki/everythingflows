"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";

interface RightSidebarContextType {
  posts: PostMeta[];
  fragments: MemoryFragment[];
  setRightSidebar: (data: { posts: PostMeta[]; fragments: MemoryFragment[] }) => void;
}

export const RightSidebarContext = createContext<RightSidebarContextType | undefined>(undefined);

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  return context;
}

export function useSetRightSidebar() {
  const context = useContext(RightSidebarContext);
  return context?.setRightSidebar;
}

interface RightSidebarProviderProps {
  children: React.ReactNode;
}

export function RightSidebarProvider({ children }: RightSidebarProviderProps) {
  const [rightSidebar, setRightSidebar] = useState<{ posts: PostMeta[]; fragments: MemoryFragment[] }>({
    posts: [],
    fragments: []
  });

  const setRightSidebarData = useCallback((data: { posts: PostMeta[]; fragments: MemoryFragment[] }) => {
    setRightSidebar(data);
  }, []);

  return (
    <RightSidebarContext.Provider value={{ ...rightSidebar, setRightSidebar: setRightSidebarData } as RightSidebarContextType}>
      {children}
    </RightSidebarContext.Provider>
  );
}
