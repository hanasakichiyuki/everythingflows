"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlaylistPanel } from "./PlaylistPanel";
import { type PlayMode, type UseMusicPlayerReturn } from "@/hooks/useMusicPlayer";

type MobilePlayerProps = {
  player: UseMusicPlayerReturn;
};

export function MobilePlayer({ player }: MobilePlayerProps) {
  const {
    isPlaying, progress, currentSong, currentCover, currentIndex,
    songs, loading, error, playMode,
    togglePlay, prevSong, nextSong, playSong, cyclePlayMode,
  } = player;

  const [showList, setShowList] = useState(false);

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {showList && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowList(false)}
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
                onSelect={(i) => { playSong(i); setShowList(false); }}
                onClose={() => setShowList(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini player bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/[0.25]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-lg flex items-center gap-2.5 px-3 py-2">
          {/* Cover */}
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg shadow-md shadow-black/20">
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

          {/* Song name + progress */}
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[12px] font-medium text-black/70">{currentSong || "Music Player"}</p>
            <div className="mt-1 h-0.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div className="h-full rounded-full bg-black/60 transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Controls */}
          <button onClick={prevSong} className="flex-shrink-0 text-black/35 active:text-black/80 active:scale-95 transition-all" aria-label="上一首">
            <svg className="h-[20px] w-[20px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="flex-shrink-0 text-black/80 active:scale-95 transition-transform"
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-7 w-7 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button onClick={nextSong} className="flex-shrink-0 text-black/35 active:text-black/80 active:scale-95 transition-all" aria-label="下一首">
            <svg className="h-[20px] w-[20px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <PlayModeIcon playMode={playMode} onClick={cyclePlayMode} />

          <button
            onClick={() => setShowList(!showList)}
            className={`flex-shrink-0 transition-colors ${showList ? "text-black/80" : "text-black/35"}`}
            aria-label="播放列表"
          >
            <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

function PlayModeIcon({ playMode, onClick }: { playMode: PlayMode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-black/35 active:text-black/80 transition-colors"
      aria-label="播放模式"
      title={playMode === "sequence" ? "顺序播放" : playMode === "random" ? "随机播放" : "单曲循环"}
    >
      {playMode === "sequence" && (
        <svg className="h-[17px] w-[17px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
        </svg>
      )}
      {playMode === "random" && (
        <svg className="h-[17px] w-[17px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
      )}
      {playMode === "loop" && (
        <svg className="h-[17px] w-[17px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
      )}
    </button>
  );
}