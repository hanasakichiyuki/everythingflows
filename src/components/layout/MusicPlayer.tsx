"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { siteConfig } from "@/config/site";

declare global {
  interface Window {
    APlayer?: {
      new (options: Record<string, unknown>): {
        destroy: () => void;
        play: () => void;
        pause: () => void;
        toggle: () => void;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
        audio: {
          currentTime: number;
          duration: number;
        };
        list: {
          audios: Array<{ name: string; artist: string; cover: string }>;
          index: number;
          switch: (index: number) => void;
        };
        volume: (value: number, toggle?: boolean) => void;
      };
    };
  }
}

type Song = { name: string; artist: string; url: string; cover: string; lrc?: string };
type PlayMode = "sequence" | "random" | "loop";

type APlayerInstance = {
  destroy: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  audio: {
    currentTime: number;
    duration: number;
  };
  list: {
    audios: Array<{ name: string; artist: string; cover: string }>;
    index: number;
    switch: (index: number) => void;
  };
  volume: (value: number, toggle?: boolean) => void;
  mode?: 'order' | 'random' | 'loop';
};

export function MusicPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<APlayerInstance | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showList, setShowList] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState("");
  const [currentCover, setCurrentCover] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0.8);
  const [playMode, setPlayMode] = useState<PlayMode>("sequence");

  const { music } = siteConfig;

  useEffect(() => {
    if (!music.enabled) return;
    setLoading(true);

    const apiMap: Record<string, string> = {
      netease: "https://api.i-meto.com/meting/api?server=netease&type=playlist&id=",
      tencent: "https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=",
    };

    const apiUrl = apiMap[music.server] || apiMap.netease;

    fetch(`${apiUrl}${music.id}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("API Response:", data);
        if (Array.isArray(data)) {
          const parsed = data.map((s: Record<string, string>) => {
            const artist = s.artist || s.author || s.singer || "";
            return {
              name: s.name || s.title || "",
              artist,
              url: s.url || "",
              cover: s.cover || s.pic || "",
              lrc: s.lrc || "",
            };
          });
          console.log("Parsed songs:", parsed.slice(0, 3));
          setSongs(parsed);
          if (parsed.length > 0) {
            setCurrentSong(`${parsed[0].name} - ${parsed[0].artist}`);
            setCurrentCover(parsed[0].cover);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load playlist:", err);
        setError("Failed to load playlist");
      })
      .finally(() => setLoading(false));
  }, [music.enabled, music.server, music.id]);

  const songsRef = useRef<Song[]>([]);
  songsRef.current = songs;

  useEffect(() => {
    if (!music.enabled || songs.length === 0 || !containerRef.current) return;

    // Destroy existing player if any
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = reject;
        document.body.appendChild(s);
      });

    const loadCss = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    };

    let cancelled = false;

    (async () => {
      try {
        loadCss("https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css");
        await loadScript("https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js");
        if (cancelled || !containerRef.current || !window.APlayer) return;

        console.log("APlayer loaded, creating instance with", songs.length, "songs");

        const APlayerClass = window.APlayer!;
        const ap = new APlayerClass({
          container: containerRef.current,
          audio: songs.map((s) => ({
            name: s.name,
            artist: s.artist,
            url: s.url,
            cover: s.cover,
            lrc: s.lrc,
          })),
          theme: "#ec4899",
          autoplay: false,
          listFolded: true,
          listMaxHeight: 200,
          lrcType: 3,
        });

        console.log("APlayer instance created successfully");
        playerRef.current = ap;
        ap.volume(volume, true);

        ap.on("play", () => {
          console.log("APlayer: play event");
          setIsPlaying(true);
        });
        ap.on("pause", () => {
          console.log("APlayer: pause event");
          setIsPlaying(false);
        });
        ap.on("error", (err) => {
          console.error("APlayer error:", err);
        });
        ap.on("timeupdate", () => {
          if (ap.audio.duration > 0) {
            setProgress((ap.audio.currentTime / ap.audio.duration) * 100);
            setCurrentTime(ap.audio.currentTime);
            setDuration(ap.audio.duration);
          }
        });
        ap.on("listswitch", () => {
          const idx = ap.list.index;
          const audio = ap.list.audios[idx];
          if (audio) {
            console.log("listswitch:", audio.name, audio.cover);
            setCurrentSong(`${audio.name} - ${audio.artist}`);
            setCurrentCover(audio.cover || "");
          }
        });

        // Also listen for loadeddata to update cover when song actually loads
        ap.on("loadeddata", () => {
          const idx = ap.list.index;
          const audio = ap.list.audios[idx];
          if (audio) {
            console.log("loadeddata:", audio.name, audio.cover);
            setCurrentSong(`${audio.name} - ${audio.artist}`);
            setCurrentCover(audio.cover || "");
          }
        });
      } catch (e) {
        console.error("Music player failed to load", e);
        setError("Failed to load player");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [music.enabled, songs]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const togglePlay = useCallback(() => {
    console.log("togglePlay called, playerRef:", playerRef.current);
    if (playerRef.current) {
      console.log("Toggling play...");
      playerRef.current.toggle();
    } else {
      console.warn("playerRef is null!");
    }
  }, []);

  const prevSong = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.list.switch(Math.max(0, playerRef.current.list.index - 1));
      playerRef.current.play();
    }
  }, []);

  const nextSong = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.list.switch(Math.min(songs.length - 1, playerRef.current.list.index + 1));
      playerRef.current.play();
    }
  }, [songs.length]);

  const playSong = useCallback((index: number) => {
    if (playerRef.current) {
      playerRef.current.list.switch(index);
      playerRef.current.play();
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    playerRef.current?.volume(v, true);
  }, []);

  const cyclePlayMode = useCallback(() => {
    const modes: PlayMode[] = ["sequence", "random", "loop"];
    const next = modes[(modes.indexOf(playMode) + 1) % modes.length];
    setPlayMode(next);
    if (playerRef.current) {
      if (next === "random") playerRef.current.mode = "random";
      else if (next === "loop") playerRef.current.mode = "loop";
      else playerRef.current.mode = "order";
    }
  }, [playMode]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    playerRef.current.audio.currentTime = ratio * duration;
  }, [duration]);

  if (!music.enabled) return null;

  return (
    <>
      {/* Player container */}
      <div
        className="fixed z-50"
        style={{
          bottom: "24px",
          right: "24px",
          width: isExpanded ? "480px" : "64px",
          height: "64px",
          transition: "width 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
            setShowList(false);
          }
        }}
      >
        {/* White capsule background - full width pill shape */}
        <div
          className="absolute border border-white/40 bg-white/90 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/90"
          style={{
            top: "0",
            left: "0",
            right: "0",
            height: "64px",
            borderRadius: "32px",
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left center",
            transition: "opacity 0.3s ease, transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
          }}
        />

        {/* Album cover - circular, click to collapse when expanded */}
        <div
          className="absolute left-0 top-0 flex h-16 w-16 items-center justify-center"
          style={{
            zIndex: 10,
            cursor: isExpanded ? "pointer" : "default",
          }}
          onClick={(e) => {
            if (isExpanded) {
              e.stopPropagation();
              setIsExpanded(false);
              setShowList(false);
            }
          }}
        >
          <div
            className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white/30 dark:border-white/10"
            style={{
              animation: "spin 40s linear infinite",
              animationPlayState: isPlaying ? "running" : "paused",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            }}
          >
            {currentCover ? (
              <img
                src={currentCover}
                alt="Album cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-800">
                <svg className="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Expanded controls - appears inside capsule */}
        <div
          className="absolute inset-0 flex items-center gap-3 pl-20 pr-4"
          style={{
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "translateX(0)" : "translateX(-10px)",
            transition: "opacity 0.3s ease 0.15s, transform 0.35s ease 0.15s",
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        >
          {/* Song info + progress */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {currentSong || (loading ? "Loading..." : "Music Player")}
            </p>
            <div
              className="mt-1 flex h-1 cursor-pointer items-center overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
              onClick={(e) => { e.stopPropagation(); handleProgressClick(e); }}
            >
              <div
                className="h-full rounded-full bg-pink-500 transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-muted/60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); prevSong(); }} className="rounded-full p-1.5 text-muted transition-colors hover:text-pink-500" aria-label="Previous">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-white transition-all hover:bg-pink-600 hover:scale-105" aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg className="h-3.5 w-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextSong(); }} className="rounded-full p-1.5 text-muted transition-colors hover:text-pink-500" aria-label="Next">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); }} className="rounded-full p-1 text-muted hover:text-pink-500" aria-label="Volume">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                {volume === 0 ? (
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
              value={volume}
              onChange={(e) => { e.stopPropagation(); handleVolumeChange(e); }}
              onClick={(e) => e.stopPropagation()}
              className="h-1 w-14 appearance-none rounded-full bg-black/10 dark:bg-white/10 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500"
            />
          </div>

          {/* Play mode */}
          <button onClick={(e) => { e.stopPropagation(); cyclePlayMode(); }} className="rounded-full p-1.5 text-muted transition-colors hover:text-pink-500" aria-label="Play mode" title={playMode === "sequence" ? "顺序播放" : playMode === "random" ? "随机播放" : "单曲循环"}>
            {playMode === "sequence" && (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" /></svg>
            )}
            {playMode === "random" && (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
            )}
            {playMode === "loop" && (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
            )}
          </button>

          {/* Playlist toggle */}
          <button onClick={(e) => { e.stopPropagation(); setShowList(!showList); }} className={`rounded-full p-1.5 transition-colors ${showList ? "text-pink-500" : "text-muted hover:text-pink-500"}`} aria-label="Playlist">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" /></svg>
          </button>
        </div>
      </div>

      {/* Playlist popup */}
      <div
        className="fixed z-40 overflow-hidden rounded-xl border border-white/40 bg-white/90 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/90"
        style={{
          bottom: "calc(24px + 64px + 8px)",
          right: "24px",
          width: "480px",
          opacity: showList ? 1 : 0,
          transform: showList ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: showList ? "auto" : "none",
          maxHeight: "300px",
        }}
      >
        <div className="px-4 py-2.5 border-b border-border/50">
          <p className="text-xs font-medium text-foreground">播放列表 ({songs.length})</p>
        </div>
        <div className="max-h-[252px] overflow-y-auto playlist-scroll px-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="py-4 text-center text-xs text-muted">{error}</p>
          ) : songs.length > 0 ? (
            <ul className="py-1">
              {songs.map((song, i) => (
                <li key={i}>
                  <button
                    onClick={() => { playSong(i); setShowList(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors rounded-lg ${
                      playerRef.current && playerRef.current.list.index === i
                        ? "bg-pink-200/60 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                        : "text-foreground/70 hover:bg-pink-100/30 hover:text-pink-500 dark:hover:bg-pink-900/10"
                    }`}
                  >
                    <span className="w-6 text-center text-muted/40 flex-shrink-0 text-[11px]">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{song.name}</span>
                    {song.artist && (
                      <span className="truncate text-muted/50 flex-shrink-0 ml-2 text-[11px]" style={{ maxWidth: "120px" }}>{song.artist}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs text-muted">No songs available</p>
          )}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .playlist-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .playlist-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }
        .playlist-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 3px;
        }
        .playlist-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25);
        }
        .dark .playlist-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
        }
        .dark .playlist-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>

      {/* Hidden APlayer container */}
      <div ref={containerRef} className="hidden" />
    </>
  );
}
