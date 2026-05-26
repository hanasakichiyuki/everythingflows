"use client";

import { motion } from "framer-motion";
import type { Song } from "@/hooks/useMusicPlayer";

type PlaylistPanelProps = {
  songs: Song[];
  currentIndex: number;
  loading: boolean;
  error: string;
  onSelect: (index: number) => void;
  onClose: () => void;
};

export function PlaylistPanel({
  songs,
  currentIndex,
  loading,
  error,
  onSelect,
  onClose,
}: PlaylistPanelProps) {
  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] shadow-xl backdrop-blur-2xl dark:border-white/[0.04] dark:bg-black/[0.2]"
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <p className="text-[11px] font-light tracking-wider text-black/60">
          播放列表 ({songs.length})
        </p>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-black/35 hover:text-black transition-colors"
          aria-label="关闭播放列表"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="max-h-[252px] overflow-y-auto playlist-scroll px-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-4 w-4 animate-spin rounded-full border border-black/10 border-t-black/40" />
          </div>
        ) : error ? (
          <p className="py-4 text-center text-[11px] text-black/35">{error}</p>
        ) : songs.length > 0 ? (
          <ul className="py-1">
            {songs.map((song, i) => (
              <li key={i}>
                <button
                  onClick={() => onSelect(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left text-[11px] transition-colors rounded-lg ${
                    currentIndex === i
                      ? "bg-white/[0.08] text-black/80"
                      : "text-black/40 hover:bg-white/[0.04] hover:text-black/80"
                  }`}
                >
                  <span className="w-5 text-center text-black/25 flex-shrink-0 text-[10px] font-light">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-light tracking-wide">{song.name}</span>
                  {song.artist && (
                    <span
                      className="truncate text-black/25 flex-shrink-0 ml-2 text-[10px] font-light"
                      style={{ maxWidth: "120px" }}
                    >
                      {song.artist}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-[11px] text-black/35">No songs available</p>
        )}
      </div>
    </motion.div>
  );
}