"use client";

import { ListMusic, Music2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { formatTime, type UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";
import { useTranslations } from "next-intl";

export function HomeMusicCard({ player }: { player: UseMusicPlayerReturn }) {
  const t = useTranslations("home.music");
  const {
    isPlaying,
    progress,
    currentTime,
    duration,
    currentSong,
    currentCover,
    songs,
    loading,
    error,
    togglePlay,
    prevSong,
    nextSong,
    seekTo,
  } = player;
  const [title, ...artistParts] = currentSong.split(" - ");
  const artist = artistParts.join(" - ");
  const unavailable = Boolean(error) || (!loading && songs.length === 0);

  return (
    <Surface className="anim-fade-up p-5" overlay={false} tone="solid">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Music2 className="h-4 w-4 text-accent" />
          {t("playing")}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <ListMusic className="h-3.5 w-3.5" />
          {songs.length}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-primary-soft">
          {currentCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentCover} alt={t("coverAlt")} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-6 w-6 text-primary/60" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-base font-semibold text-foreground">
            {loading ? t("loading") : unavailable ? (error ? t("unavailable") : t("empty")) : title || t("playlist")}
          </p>
          <p className="mt-1 truncate text-xs text-muted">{unavailable ? t("tryAgainLater") : artist || t("provider")}</p>
        </div>
      </div>

      <div className="relative mt-5 h-4 focus-within:ring-2 focus-within:ring-ring">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-primary-soft" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(event) => seekTo(Number(event.target.value) / 100)}
          disabled={duration === 0 || unavailable}
          aria-label={t("progress")}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-muted">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-5">
        <button type="button" onClick={prevSong} disabled={unavailable} className="rounded-lg p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("previous")}>
          <SkipBack className="h-4 w-4" fill="currentColor" />
        </button>
        <button type="button" onClick={togglePlay} disabled={unavailable} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-40" aria-label={isPlaying ? t("pause") : t("play")}>
          {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
        </button>
        <button type="button" onClick={nextSong} disabled={unavailable} className="rounded-lg p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("next")}>
          <SkipForward className="h-4 w-4" fill="currentColor" />
        </button>
      </div>
    </Surface>
  );
}
