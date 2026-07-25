"use client";

import { createContext, useContext, useRef } from "react";
import { type UseMusicPlayerReturn, useMusicPlayer } from "@/hooks/useMusicPlayer";

const MusicPlayerContext = createContext<UseMusicPlayerReturn | null>(null);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = useMusicPlayer(containerRef);

  return (
    <MusicPlayerContext.Provider value={player}>
      <div ref={containerRef} className="hidden" aria-hidden />
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayerContext() {
  const player = useContext(MusicPlayerContext);

  if (!player) {
    throw new Error("useMusicPlayerContext must be used within MusicPlayerProvider");
  }

  return player;
}
