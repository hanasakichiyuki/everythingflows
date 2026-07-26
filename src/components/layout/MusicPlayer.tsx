"use client";

import { useSyncExternalStore } from "react";
import { DesktopPlayer } from "./DesktopPlayer";
import { MobilePlayer } from "./MobilePlayer";
import { HomeMusicCard } from "./HomeMusicCard";
import { useMusicPlayerContext } from "./MusicPlayerProvider";

export type { UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";

// Keep this in sync with Tailwind's `md` breakpoint: 768px starts the desktop shell.
const mobileMediaQuery = "(max-width: 767px)";

function subscribeToMobileViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(mobileMediaQuery);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getMobileViewportSnapshot() {
  return window.matchMedia(mobileMediaQuery).matches;
}

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
  const isMobile = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  );

  // Don't render until we know the screen size to avoid hydration mismatch
  if (!player.musicEnabled || !player.isMounted) return null;

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
