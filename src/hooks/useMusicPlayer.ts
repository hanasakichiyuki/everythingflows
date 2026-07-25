"use client";

import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { siteConfig } from "@/config/site";

// ---------- APlayer global type ----------
declare global {
  interface Window {
    APlayer?: {
      new (options: Record<string, unknown>): APlayerInstance;
    };
  }
}

export type Song = { name: string; artist: string; url: string; cover: string; lrc?: string };
export type PlayMode = "sequence" | "random" | "loop";

export type APlayerInstance = {
  destroy: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  audio: HTMLAudioElement;
  list: {
    audios: Array<{ name: string; artist: string; cover: string }>;
    index: number;
    switch: (index: number) => void;
  };
  volume: (value: number, toggle?: boolean) => void;
  mode?: "order" | "random" | "loop";
};

function safelyDestroyPlayer(player: APlayerInstance) {
  // APlayer 1.10.1 schedules skipForward after a media error. Clearing src in
  // destroy() can emit that error after its DOM has already been removed,
  // causing an asynchronous `undefined.classList` exception.
  const suppressTeardownError = (event: Event) => {
    event.stopImmediatePropagation();
  };
  player.audio.addEventListener("error", suppressTeardownError, {
    capture: true,
    once: true,
  });
  player.destroy();
}

export function useMusicPlayer(containerRef: RefObject<HTMLDivElement | null>) {
  const playerRef = useRef<APlayerInstance | null>(null);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playlistKeyRef = useRef("");
  const playHistoryRef = useRef<number[]>([]);
  const volumeBeforeMute = useRef(0.8);

  const [isMounted, setIsMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState("");
  const [currentCover, setCurrentCover] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isSwitchingTrack, setIsSwitchingTrack] = useState(false);
  const [playlistRequest, setPlaylistRequest] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("sequence");

  const { music } = siteConfig;

  const retryPlaylist = useCallback(() => {
    setPlaylistRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  const scheduleDestroy = useCallback((player: APlayerInstance) => {
    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
    }
    destroyTimerRef.current = setTimeout(() => {
      if (playerRef.current === player) {
        safelyDestroyPlayer(player);
        playerRef.current = null;
        playlistKeyRef.current = "";
      }
      destroyTimerRef.current = null;
    }, 100);
  }, []);

  // -------- Fetch playlist --------
  useEffect(() => {
    if (!music.enabled) return;
    const apiMap: Record<string, string> = {
      netease: "https://api.i-meto.com/meting/api?server=netease&type=playlist&id=",
      tencent: "https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=",
    };
    const apiUrl = apiMap[music.server] || apiMap.netease;
    const controller = new AbortController();

    const loadPlaylist = async () => {
      setLoading(true);
      setError("");
      setIsPlayerReady(false);
      setIsSwitchingTrack(false);

      try {
        const response = await fetch(`${apiUrl}${music.id}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`playlist request failed: ${response.status}`);

        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("playlist response is not an array");

        const parsed = data.flatMap((item): Song[] => {
          if (!item || typeof item !== "object") return [];
          const source = item as Record<string, unknown>;
          const url = typeof source.url === "string" ? source.url.trim() : "";
          if (!url) return [];
          const artist = [source.artist, source.author, source.singer].find(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          ) ?? "";
          let cover = typeof source.cover === "string" ? source.cover : typeof source.pic === "string" ? source.pic : "";
          if (cover.startsWith("//")) cover = `https:${cover}`;
          const name = typeof source.name === "string" ? source.name : typeof source.title === "string" ? source.title : "";
          const lrc = typeof source.lrc === "string" ? source.lrc : undefined;
          return [{ name, artist, url, cover, lrc }];
        });

        if (controller.signal.aborted) return;
        setSongs(parsed);
        const firstSong = parsed[0];
        setCurrentSong(firstSong ? `${firstSong.name} - ${firstSong.artist}` : "");
        setCurrentCover(firstSong?.cover ?? "");
        setCurrentIndex(0);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        console.error("Failed to load playlist:", requestError);
        setSongs([]);
        setCurrentSong("");
        setCurrentCover("");
        setError("音乐服务暂时不可用");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadPlaylist();
    return () => controller.abort();
  }, [music.enabled, music.server, music.id, playlistRequest]);

  // -------- Create APlayer instance --------
  useEffect(() => {
    if (!music.enabled || songs.length === 0) return;

    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }

    const playlistKey = songs.map((song) => song.url).join("\n");
    if (playerRef.current && playlistKeyRef.current === playlistKey) {
      const existingPlayer = playerRef.current;
      setIsPlayerReady(true);
      return () => scheduleDestroy(existingPlayer);
    }

    if (playerRef.current) {
      safelyDestroyPlayer(playerRef.current);
      playerRef.current = null;
      playlistKeyRef.current = "";
    }

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
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
        setIsPlayerReady(false);
        loadCss("/libs/APlayer.min.css");
        await loadScript("/libs/APlayer.min.js");
        if (cancelled || !containerRef.current || !window.APlayer) return;

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
          theme: "#208cab",
          autoplay: false,
          listFolded: true,
          listMaxHeight: 200,
          lrcType: 0,
        });

        const playerContainer = containerRef.current;
        const switchAudio = ap.list.switch.bind(ap.list);
        ap.list.switch = (index: number) => {
          // APlayer keeps a two-second "skip failed track" timeout alive after
          // destroy(). Ignore that stale callback once React removed its list.
          if (
            !playerContainer.isConnected ||
            !playerContainer.querySelectorAll(".aplayer-list li")[index]
          ) {
            return;
          }
          switchAudio(index);
        };

        playerRef.current = ap;
        playlistKeyRef.current = playlistKey;
        ap.volume(volume, false);
        setIsPlayerReady(true);

        ap.on("play", () => setIsPlaying(true));
        ap.on("pause", () => {
          setIsPlaying(false);
          // 通知 Live2D 音乐暂停
          window.dispatchEvent(new CustomEvent("live2d:music-pause"));
        });
        ap.on("error", (err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
        });
        ap.on("timeupdate", () => {
          if (ap.audio.duration > 0) {
            setProgress((ap.audio.currentTime / ap.audio.duration) * 100);
            setCurrentTime(ap.audio.currentTime);
            setDuration(ap.audio.duration);
          }
        });
        ap.on("listswitch", () => {
          setTimeout(() => {
            const idx = ap.list.index;
            const audio = ap.list.audios[idx];
            if (audio) {
              const songName = `${audio.name} - ${audio.artist}`;
              setCurrentSong(songName);
              setCurrentCover(audio.cover || "");
              setCurrentIndex(idx);
              playHistoryRef.current.push(idx);
              if (playHistoryRef.current.length > 50) {
                playHistoryRef.current = playHistoryRef.current.slice(-50);
              }
              // 通知 Live2D 音乐切换
              window.dispatchEvent(
                new CustomEvent("live2d:music-change", { detail: { songName } })
              );
            }
            if (switchTimerRef.current) {
              clearTimeout(switchTimerRef.current);
              switchTimerRef.current = null;
            }
            setIsSwitchingTrack(false);
          }, 50);
        });
        if (songs.length > 0) {
          setCurrentSong(`${songs[0].name} - ${songs[0].artist}`);
          setCurrentCover(songs[0].cover);
          setCurrentIndex(0);
          playHistoryRef.current = [0];
        }
      } catch (e) {
        console.error("Music player failed to load", e);
        setIsPlayerReady(false);
        setError("播放器初始化失败");
      }
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        scheduleDestroy(playerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.enabled, scheduleDestroy, songs]);

  // -------- Playback controls --------
  const setSongInfo = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < songs.length) {
        const s = songs[idx];
        setCurrentSong(`${s.name} - ${s.artist}`);
        setCurrentCover(s.cover || "");
        setCurrentIndex(idx);
      }
    },
    [songs],
  );

  const togglePlay = useCallback(() => {
    playerRef.current?.toggle();
  }, []);

  const switchSong = useCallback(
    (index: number) => {
      const player = playerRef.current;
      if (!player || index === player.list.index) return;
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      setIsSwitchingTrack(true);
      switchTimerRef.current = setTimeout(() => {
        setIsSwitchingTrack(false);
        switchTimerRef.current = null;
      }, 1500);
      player.list.switch(index);
      setSongInfo(index);
    },
    [setSongInfo],
  );

  const prevSong = useCallback(() => {
    if (!playerRef.current || songs.length === 0) return;
    let idx: number;
    if (playMode === "random") {
      if (playHistoryRef.current.length >= 2) {
        playHistoryRef.current.pop();
        idx = playHistoryRef.current[playHistoryRef.current.length - 1];
      } else {
        idx = playerRef.current.list.index;
      }
    } else {
      idx = Math.max(0, playerRef.current.list.index - 1);
    }
    switchSong(idx);
  }, [playMode, songs.length, switchSong]);

  const nextSong = useCallback(() => {
    if (!playerRef.current || songs.length === 0) return;
    let idx: number;
    if (playMode === "random") {
      const currentIdx = playerRef.current.list.index;
      do {
        idx = Math.floor(Math.random() * songs.length);
      } while (idx === currentIdx && songs.length > 1);
    } else {
      idx = Math.min(songs.length - 1, playerRef.current.list.index + 1);
    }
    switchSong(idx);
  }, [songs.length, playMode, switchSong]);

  const playSong = useCallback(
    (index: number) => {
      if (index < 0 || index >= songs.length) return;
      switchSong(index);
    },
    [songs.length, switchSong],
  );

  // -------- Volume --------
  const handleVolumeChange = useCallback(
    (v: number) => {
      setVolume(v);
      if (v > 0 && isMuted) {
        setIsMuted(false);
      }
      playerRef.current?.volume(v, false);
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        volumeBeforeMute.current = volume;
        playerRef.current?.volume(0, false);
      } else {
        setVolume(volumeBeforeMute.current);
        playerRef.current?.volume(volumeBeforeMute.current, false);
      }
      return next;
    });
  }, [volume]);

  // -------- Play mode --------
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

  // -------- Progress --------
  const seekTo = useCallback(
    (ratio: number) => {
      if (!playerRef.current || duration === 0) return;
      playerRef.current.audio.currentTime = ratio * duration;
    },
    [duration],
  );

  return {
    isMounted,
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
    musicEnabled: music.enabled,
    togglePlay,
    prevSong,
    nextSong,
    playSong,
    handleVolumeChange,
    toggleMute,
    cyclePlayMode,
    seekTo,
    retryPlaylist,
  };
}

export const formatTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export type UseMusicPlayerReturn = ReturnType<typeof useMusicPlayer>;
