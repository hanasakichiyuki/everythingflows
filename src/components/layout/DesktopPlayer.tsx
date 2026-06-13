"use client";

import { useState, useCallback } from "react";
import { PlaylistPanel } from "./PlaylistPanel";
import { formatTime, type PlayMode, type UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";

type DesktopPlayerProps = {
  player: UseMusicPlayerReturn;
  collapsed?: boolean;
};

export function DesktopPlayer({ player, collapsed }: DesktopPlayerProps) {
  const {
    isPlaying, progress, currentTime, duration, currentSong, currentCover, currentIndex,
    songs, loading, error, volume, isMuted, playMode,
    togglePlay, prevSong, nextSong, playSong,
    handleVolumeChange, toggleMute, cyclePlayMode, seekTo,
  } = player;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showList, setShowList] = useState(false);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      seekTo(ratio);
    },
    [seekTo],
  );

  const closeAll = useCallback(() => {
    setIsExpanded(false);
    setShowList(false);
  }, []);

  return (
    <>
      {/* Overlay: click anywhere to close expanded / playlist */}
      {(isExpanded || showList) && (
        <div
          className="anim-fade-in fixed inset-0 z-40"
          onClick={closeAll}
        />
      )}

      {/* Playlist popup (above overlay, below player) */}
      {showList && (
        <div
          className="fixed z-50"
          style={{
            bottom: "calc(24px + 64px + 8px)",
            left: "24px",
            width: "480px",
          }}
        >
          <PlaylistPanel
            songs={songs}
            currentIndex={currentIndex}
            loading={loading}
            error={error}
            onSelect={(i) => { playSong(i); closeAll(); }}
            onClose={closeAll}
          />
        </div>
      )}

      {/* Player capsule */}
      <div
        className="music-player-btn fixed z-50 border border-white/[0.08] bg-white/[0.06] shadow-lg backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/[0.15]"
        style={{
          bottom: "24px",
          left: "24px",
          width: isExpanded ? "480px" : "64px",
          height: "64px",
          borderRadius: "9999px",
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          transition: "opacity 0.3s ease, width 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >

        {/* Album cover */}
        <button
          className="absolute left-0 top-0 flex h-16 w-16 items-center justify-center"
          style={{ zIndex: 10 }}
          onClick={() => {
            if (isExpanded) {
              closeAll();
            } else {
              setIsExpanded(true);
            }
          }}
          aria-label={isExpanded ? "收起播放器" : "展开播放器"}
        >
          <div
            className="relative h-14 w-14 overflow-hidden rounded-full transition-all duration-500 hover:scale-105"
            style={{
              animation: "spin 40s linear infinite",
              animationPlayState: isPlaying ? "running" : "paused",
              boxShadow: "0 2px 20px rgba(0,0,0,0.4)",
              filter: "saturate(0.7) brightness(0.9)",
            }}
          >
            {currentCover ? (
              <img
                src={currentCover}
                alt="Album cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                <svg className="h-6 w-6 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Expanded controls */}
        {isExpanded && (
          <div className="anim-fade-left absolute inset-0 flex items-center gap-4 pl-20 pr-5">
              {/* Song info + progress */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-light tracking-wide text-black/80">
                  {currentSong || (loading ? "Loading..." : "Music Player")}
                </p>
                <div
                  className="mt-1.5 flex h-[2px] cursor-pointer items-center overflow-hidden rounded-full bg-black/15"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full rounded-full bg-black/70 transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-light tracking-wider text-black/35">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback controls */}
              <ControlButtons
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                prevSong={prevSong}
                nextSong={nextSong}
              />

              {/* Volume */}
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={handleVolumeChange}
                onToggleMute={toggleMute}
              />

              {/* Play mode */}
              <PlayModeButton playMode={playMode} onClick={cyclePlayMode} />

              {/* Playlist toggle */}
              <button
                onClick={() => setShowList(!showList)}
                className={`transition-colors ${showList ? "text-black/80" : "text-black/35 hover:text-black"}`}
                aria-label="播放列表"
              >
                <svg className="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
              </button>
            </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .playlist-scroll::-webkit-scrollbar { width: 4px; }
        .playlist-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 2px; }
        .playlist-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .playlist-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </>
  );
}

// ---------- Sub-components ----------

function ControlButtons({
  isPlaying, togglePlay, prevSong, nextSong,
}: {
  isPlaying: boolean; togglePlay: () => void; prevSong: () => void; nextSong: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={prevSong} className="text-black/40 hover:text-black active:scale-95 transition-all" aria-label="上一首">
        <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>
      <button onClick={togglePlay} className="text-black/80 hover:text-black active:scale-95 transition-all" aria-label={isPlaying ? "暂停" : "播放"}>
        {isPlaying ? (
          <svg className="h-[26px] w-[26px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="h-[26px] w-[26px] pl-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <button onClick={nextSong} className="text-black/40 hover:text-black active:scale-95 transition-all" aria-label="下一首">
        <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>
    </div>
  );
}

function VolumeControl({
  volume, isMuted, onVolumeChange, onToggleMute,
}: {
  volume: number; isMuted: boolean; onVolumeChange: (v: number) => void; onToggleMute: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={onToggleMute} className="text-black/35 hover:text-black transition-colors" aria-label="音量">
        <svg className="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24">
          {isMuted || volume === 0 ? (
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          ) : volume < 0.5 ? (
            <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
          ) : (
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          )}
        </svg>
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="h-[2px] w-12 appearance-none rounded-full bg-black/15 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black/60 [&::-webkit-slider-thumb]:hover:bg-black"
      />
    </div>
  );
}

function PlayModeButton({ playMode, onClick }: { playMode: PlayMode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-black/35 hover:text-black transition-colors"
      aria-label="播放模式"
      title={playMode === "sequence" ? "顺序播放" : playMode === "random" ? "随机播放" : "单曲循环"}
    >
      {playMode === "sequence" && (
        <svg className="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
        </svg>
      )}
      {playMode === "random" && (
        <svg className="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
      )}
      {playMode === "loop" && (
        <svg className="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
      )}
    </button>
  );
}