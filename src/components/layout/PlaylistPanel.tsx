"use client";

import { LoaderCircle, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Song } from "@/hooks/useMusicPlayer";

type PlaylistPanelProps = {
  songs: Song[];
  currentIndex: number;
  loading: boolean;
  error: string;
  isSwitchingTrack?: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
  onRetry?: () => void;
  variant?: "floating" | "embedded";
};

export function PlaylistPanel({
  songs,
  currentIndex,
  loading,
  error,
  isSwitchingTrack = false,
  onSelect,
  onClose,
  onRetry,
  variant = "floating",
}: PlaylistPanelProps) {
  const t = useTranslations("home.music");
  const isEmbedded = variant === "embedded";

  return (
    <div
      className={
        isEmbedded
          ? "overflow-hidden text-foreground"
          : "anim-bubble-in overflow-hidden rounded-2xl border border-border/70 bg-background/90 text-foreground shadow-xl backdrop-blur-2xl"
      }
      role="region"
      aria-label={t("playlist")}
    >
      <div className={`flex items-center justify-between border-b border-border/60 ${isEmbedded ? "pb-2" : "px-5 py-3"}`}>
        <p className="text-[11px] font-medium tracking-wider text-foreground/80">
          {t("playlistTitle", { count: songs.length })}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("closePlaylist")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={`max-h-[252px] overflow-y-auto playlist-scroll ${isEmbedded ? "pr-1" : "px-1"}`}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin text-primary" aria-hidden />
            {t("loading")}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
            <p className="text-xs leading-5 text-muted">{t("unavailable")}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("retry")}
              </button>
            )}
          </div>
        ) : songs.length > 0 ? (
          <ul className={isEmbedded ? "divide-y divide-border/45" : "py-1"}>
            {songs.map((song, index) => (
              <li key={`${song.url}-${index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  disabled={isSwitchingTrack}
                  aria-current={currentIndex === index ? "true" : undefined}
                  className={`flex w-full items-center gap-3 ${isEmbedded ? "px-2 py-2.5" : "rounded-lg px-4 py-2"} text-left text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
                    currentIndex === index
                      ? isEmbedded
                        ? "bg-primary-soft/65 text-primary"
                        : "bg-primary-soft text-primary"
                      : "text-foreground/75 hover:bg-foreground/[0.045] hover:text-foreground"
                  }`}
                >
                  <span className="w-5 shrink-0 text-center text-[10px] text-muted">{index + 1}</span>
                  <span className="flex-1 truncate tracking-wide">{song.name}</span>
                  {song.artist && (
                    <span className="ml-2 shrink-0 truncate text-[10px] text-muted" style={{ maxWidth: "120px" }}>
                      {song.artist}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-xs text-muted">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
