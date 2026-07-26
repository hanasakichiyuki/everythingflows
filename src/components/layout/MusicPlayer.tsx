"use client";

import { useSyncExternalStore } from "react";
import { DesktopPlayer } from "./DesktopPlayer";
import { MobilePlayer } from "./MobilePlayer";
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
  hidden = false,
}: {
  hidden?: boolean;
}) {
  const player = useMusicPlayerContext();
  const isMobile = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  );

  return (
    <div className={hidden ? "hidden" : undefined} aria-hidden={hidden || undefined}>
      {isMobile ? (
        <MobilePlayer player={player} />
      ) : (
        <DesktopPlayer player={player} />
      )}
    </div>
  );
}
