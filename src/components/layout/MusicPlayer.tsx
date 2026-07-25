"use client";

import { useEffect, useState } from "react";
import { DesktopPlayer } from "./DesktopPlayer";
import { MobilePlayer } from "./MobilePlayer";
import { HomeMusicCard } from "./HomeMusicCard";
import { useMusicPlayerContext } from "./MusicPlayerProvider";

export type { UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";

export function MusicPlayer({
  collapsed,
  hidden = false,
  variant = "floating",
}: {
  collapsed?: boolean;
  hidden?: boolean;
  variant?: "floating" | "home";
}) {
  const player = useMusicPlayerContext();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Don't render until we know the screen size to avoid hydration mismatch
  if (isMobile === null || !player.musicEnabled || !player.isMounted) return null;

  return (
    <div className={hidden ? "hidden" : undefined} aria-hidden={hidden || undefined}>
      {isMobile ? (
        <MobilePlayer player={player} />
      ) : variant === "home" ? (
        <HomeMusicCard player={player} />
      ) : (
        <DesktopPlayer player={player} collapsed={collapsed} />
      )}
    </div>
  );
}
