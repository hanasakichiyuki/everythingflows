"use client";

import { useCallback, useState } from "react";
import {
  ListMusic,
  ListOrdered,
  Music2,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PlaylistPanel } from "./PlaylistPanel";
import {
  formatTime,
  type PlayMode,
  type UseMusicPlayerReturn,
} from "@/hooks/useMusicPlayer";

type DesktopPlayerProps = {
  player: UseMusicPlayerReturn;
};

export function DesktopPlayer({ player }: DesktopPlayerProps) {
  const t = useTranslations("home.music");
  const {
    isPlaying,
    progress,
    currentTime,
    duration,
    currentSong,
    currentCover,
    currentIndex,
    songs,
    loading,
    error,
    isPlayerReady,
    isSwitchingTrack,
    volume,
    isMuted,
    playMode,
    togglePlay,
    prevSong,
    nextSong,
    playSong,
    handleVolumeChange,
    toggleMute,
    cyclePlayMode,
    seekTo,
    retryPlaylist,
  } = player;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showList, setShowList] = useState(false);
  const [title, ...artistParts] = currentSong.split(" - ");
  const artist = artistParts.join(" - ");
  const unavailable = Boolean(error) || (!loading && songs.length === 0);
  const controlsDisabled = unavailable || !isPlayerReady || isSwitchingTrack;
  const statusLabel = loading
    ? t("loading")
    : unavailable
      ? error
        ? t("unavailable")
        : t("empty")
      : !isPlayerReady
        ? t("preparing")
        : isSwitchingTrack
          ? t("switching")
          : title || t("playlist");

  const closePlayer = useCallback(() => {
    setIsExpanded(false);
    setShowList(false);
  }, []);

  return (
    <>
      {isExpanded && (
        <button
          type="button"
          className="anim-fade-in fixed inset-0 z-40 cursor-default"
          onClick={closePlayer}
          aria-label="关闭音乐播放器"
        />
      )}

      {isExpanded && (
        <section
          id="desktop-player-panel"
          className="anim-fade-left fixed bottom-6 right-[104px] z-50 max-h-[calc(100vh-48px)] overflow-y-auto rounded-[1.5rem] border border-border/80 bg-surface/95 p-5 text-foreground shadow-[0_20px_55px_-28px_rgba(17,70,84,0.45)] backdrop-blur-2xl"
          style={{ width: "min(420px, calc(100vw - 112px))" }}
          aria-label="音乐播放器"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Music2 className="h-4 w-4 text-primary" />
              <span>音乐</span>
            </div>
            <button
              type="button"
              onClick={closePlayer}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="收起音乐播放器"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <AlbumCover cover={currentCover} isPlaying={isPlaying} title={title} size="panel" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {statusLabel}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {unavailable
                  ? t("tryAgainLater")
                  : isSwitchingTrack
                    ? t("switching")
                    : artist || t("provider")}
              </p>
              {error && (
                <button
                  type="button"
                  onClick={retryPlaylist}
                  className="mt-2 rounded-md text-xs font-medium text-primary transition-colors hover:text-primary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("retry")}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              disabled={controlsDisabled}
              onVolumeChange={handleVolumeChange}
              onToggleMute={toggleMute}
            />
            <PlayModeButton
              playMode={playMode}
              disabled={controlsDisabled}
              onClick={cyclePlayMode}
            />
          </div>

          <div className="relative mt-4 h-4 rounded focus-within:ring-2 focus-within:ring-ring">
            <div
              className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-primary-soft"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={progress}
              onChange={(event) => seekTo(Number(event.target.value) / 100)}
              disabled={duration === 0 || controlsDisabled}
              aria-label={t("progress")}
              aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex justify-between text-[10px] tabular-nums text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={prevSong}
              disabled={controlsDisabled}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("previous")}
            >
              <SkipBack className="h-5 w-5" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={controlsDisabled}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={isPlaying ? t("pause") : t("play")}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={nextSong}
              disabled={controlsDisabled}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("next")}
            >
              <SkipForward className="h-5 w-5" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setShowList((open) => !open)}
              className={`rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                showList
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-primary-soft hover:text-primary"
              }`}
              aria-label={t("playlist")}
              aria-expanded={showList}
              aria-controls="desktop-playlist"
            >
              <ListMusic className="h-5 w-5" />
            </button>
          </div>

          {showList && (
            <div id="desktop-playlist" className="mt-4 border-t border-border/60 pt-4">
              <PlaylistPanel
                songs={songs}
                currentIndex={currentIndex}
                loading={loading}
                error={error}
                isSwitchingTrack={isSwitchingTrack}
                onSelect={(index) => {
                  playSong(index);
                  setShowList(false);
                }}
                onClose={() => setShowList(false)}
                onRetry={retryPlaylist}
                variant="embedded"
              />
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => (isExpanded ? closePlayer() : setIsExpanded(true))}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-foreground shadow-[0_14px_28px_-14px_rgba(17,70,84,0.55)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
        aria-label={isExpanded ? "收起音乐播放器" : "展开音乐播放器"}
        aria-expanded={isExpanded}
        aria-controls="desktop-player-panel"
      >
        <AlbumCover cover={currentCover} isPlaying={isPlaying} title={title} size="trigger" />
      </button>

      <style>{`
        @keyframes music-cover-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function AlbumCover({
  cover,
  isPlaying,
  title,
  size,
}: {
  cover: string;
  isPlaying: boolean;
  title: string;
  size: "trigger" | "panel";
}) {
  const dimensions = size === "trigger" ? "h-14 w-14" : "h-[72px] w-[72px]";
  const shape = size === "trigger" ? "rounded-full" : "rounded-2xl";
  const shouldSpin = size === "trigger" && isPlaying;

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-primary-soft ${shape} ${dimensions}`}
      style={{
        animation: shouldSpin ? "music-cover-spin 40s linear infinite" : "none",
      }}
    >
      {cover ? (
        // APlayer 封面来自用户配置的第三方音乐服务，无法安全预先枚举图片域名和尺寸。
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={title ? `${title} 封面` : "当前歌曲封面"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary/60">
          <Music2 className={size === "trigger" ? "h-6 w-6" : "h-7 w-7"} />
        </div>
      )}
    </div>
  );
}

function VolumeControl({
  volume,
  isMuted,
  disabled,
  onVolumeChange,
  onToggleMute,
}: {
  volume: number;
  isMuted: boolean;
  disabled: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={isMuted ? "取消静音" : "静音"}
      >
        {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
        disabled={disabled}
        aria-label="音量"
        className="h-1 w-16 appearance-none rounded-full bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
    </div>
  );
}

function PlayModeButton({
  playMode,
  disabled,
  onClick,
}: {
  playMode: PlayMode;
  disabled: boolean;
  onClick: () => void;
}) {
  const labels: Record<PlayMode, string> = {
    sequence: "顺序播放",
    random: "随机播放",
    loop: "单曲循环",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={`播放模式：${labels[playMode]}`}
      title={labels[playMode]}
    >
      {playMode === "sequence" && <ListOrdered className="h-4 w-4" />}
      {playMode === "random" && <Shuffle className="h-4 w-4" />}
      {playMode === "loop" && <Repeat1 className="h-4 w-4" />}
      <span>{labels[playMode]}</span>
    </button>
  );
}
