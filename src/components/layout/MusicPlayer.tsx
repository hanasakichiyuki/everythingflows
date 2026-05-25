"use client";

import { useEffect, useState } from "react";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import { DesktopPlayer } from "./DesktopPlayer";
import { MobilePlayer } from "./MobilePlayer";

export type { UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";

export function MusicPlayer({ collapsed }: { collapsed?: boolean }) {
  const player = useMusicPlayer();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (!player.musicEnabled || !player.isMounted) return null;

  return (
    <>
      {/* Hidden APlayer container - needed for the library to render audio element */}
      <div ref={player.containerRef} className="hidden" />

      {isMobile ? (
        <MobilePlayer player={player} />
      ) : (
        <DesktopPlayer player={player} collapsed={collapsed} />
      )}
    </>
  );
}