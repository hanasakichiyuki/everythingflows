"use client";

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
    <div
      className="anim-bubble-in overflow-hidden rounded-2xl border border-border/70 bg-background/90 text-foreground shadow-xl backdrop-blur-2xl"
      role="region"
      aria-label="播放列表"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <p className="text-[11px] font-light tracking-wider text-foreground/80">
          播放列表 ({songs.length})
        </p>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="h-4 w-4 animate-spin rounded-full border border-foreground/15 border-t-foreground" />
          </div>
        ) : error ? (
          <p className="py-4 text-center text-[11px] text-muted">{error}</p>
        ) : songs.length > 0 ? (
          <ul className="py-1">
            {songs.map((song, i) => (
              <li key={i}>
                <button
                  onClick={() => onSelect(i)}
                  aria-current={currentIndex === i ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    currentIndex === i
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <span className="w-5 flex-shrink-0 text-center text-[10px] font-light text-muted">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-light tracking-wide">{song.name}</span>
                  {song.artist && (
                    <span
                      className="ml-2 flex-shrink-0 truncate text-[10px] font-light text-muted"
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
          <p className="py-4 text-center text-[11px] text-muted">暂无可播放歌曲</p>
        )}
      </div>
    </div>
  );
}