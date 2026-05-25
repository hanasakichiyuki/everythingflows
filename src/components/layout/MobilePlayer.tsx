"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlaylistPanel } from "./PlaylistPanel";
import { formatTime, type PlayMode, type UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";

type MobilePlayerProps = {
  player: UseMusicPlayerReturn;
};

export function MobilePlayer({ player }: MobilePlayerProps) {
  const {
    isPlaying, progress, currentTime, duration, currentSong, currentCover, currentIndex,
    songs, loading, error, volume, isMuted, playMode,
    togglePlay, prevSong, nextSong, playSong,
    handleVolumeChange, toggleMute, cyclePlayMode,
  } = player;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showList, setShowList] = useState(false);

  const closeAll = useCallback(() => {
    setIsExpanded(false);
    setShowList(false);
  }, []);

  return (
    <>
      {/* Overlay: click to close expanded panel or playlist */}
      <AnimatePresence>
        {(isExpanded || showList) && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAll}
          />
        )}
      </AnimatePresence>

      {/* Playlist bottom sheet */}
      <AnimatePresence>
        {showList && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="mx-auto max-w-lg">
              <PlaylistPanel
                songs={songs}
                currentIndex={currentIndex}
                loading={loading}
                error={error}
                onSelect={(i) => { playSong(i); closeAll(); }}
                onClose={closeAll}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded controls panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.06] p-5 shadow-xl backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/[0.25]">
              {/* Cover + Song info */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl shadow-lg"
                  style={{
                    animation: isPlaying ? "spin 20s linear infinite" : "none",
                  }}
                >
                  {currentCover ? (
                    <img src={currentCover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                      <svg className="h-6 w-6 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">{currentSong || "Music Player"}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1 rounded-full bg-zinc-700/50 overflow-hidden">
                      <div className="h-full rounded-full bg-zinc-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                    </div>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Main controls */}
              <div className="flex items-center justify-center gap-5 mb-4">
                <button onClick={prevSong} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 active:scale-95 transition-transform" aria-label="上一首">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>
                <button onClick={togglePlay} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-lg active:scale-95 transition-transform" aria-label={isPlaying ? "暂停" : "播放"}>
                  {isPlaying ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button onClick={nextSong} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 active:scale-95 transition-transform" aria-label="下一首">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>

              {/* Secondary controls row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className="text-zinc-400 active:text-zinc-200 transition-colors" aria-label="音量">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      {isMuted || volume === 0 ? (
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      ) : (
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      )}
                    </svg>
                  </button>
                  <div className="w-24">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="h-1 w-full appearance-none rounded-full bg-zinc-700/50 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <PlayModeIcon playMode={playMode} onClick={cyclePlayMode} />
                  <button
                    onClick={() => setShowList(!showList)}
                    className={`${showList ? "text-zinc-200" : "text-zinc-400"} active:text-zinc-200 transition-colors`}
                    aria-label="播放列表"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini player bar (always visible) */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/[0.25]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-lg flex items-center gap-3 px-4 py-2">
          {/* Cover */}
          <button onClick={() => setIsExpanded(true)} className="flex-shrink-0" aria-label="展开播放器">
            <div
              className="relative h-10 w-10 overflow-hidden rounded-lg shadow-md"
              style={{
                animation: isPlaying ? "spin 20s linear infinite" : "none",
              }}
            >
              {currentCover ? (
                <img src={currentCover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                  <svg className="h-4 w-4 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Song name + progress (clickable to expand) */}
          <button
            onClick={() => setIsExpanded(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-xs font-medium text-zinc-200">{currentSong || "Music Player"}</p>
            <div className="mt-1 h-0.5 w-full rounded-full bg-zinc-700/50 overflow-hidden">
              <div className="h-full rounded-full bg-zinc-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          </button>

          {/* Play/pause */}
          <button
            onClick={togglePlay}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-900 shadow active:scale-95 transition-transform"
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Playlist */}
          <button
            onClick={() => setShowList(!showList)}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${showList ? "text-zinc-200" : "text-zinc-400"} active:text-zinc-200 transition-colors`}
            aria-label="播放列表"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

function PlayModeIcon({ playMode, onClick }: { playMode: PlayMode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-zinc-400 active:text-zinc-200 transition-colors"
      aria-label="播放模式"
      title={playMode === "sequence" ? "顺序播放" : playMode === "random" ? "随机播放" : "单曲循环"}
    >
      {playMode === "sequence" && (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
        </svg>
      )}
      {playMode === "random" && (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
      )}
      {playMode === "loop" && (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
      )}
    </button>
  );
}