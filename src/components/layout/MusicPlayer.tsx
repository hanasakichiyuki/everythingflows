"use client";

import { useEffect, useRef } from "react";
import { siteConfig } from "@/config/site";

declare global {
  interface Window {
    APlayer?: new (options: Record<string, unknown>) => { destroy: () => void };
    MetingJSElement?: unknown;
  }
}

/**
 * NetEase Cloud Music via APlayer + MetingJS (loaded from CDN).
 * Configure playlist/song in site.config.json → music
 */
export function MusicPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const { music } = siteConfig;
    if (!music.enabled || !containerRef.current) return;

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
        await loadScript("https://cdn.jsdelivr.net/npm/meting@2/dist/Meting.min.js");
        if (cancelled || !containerRef.current || !window.APlayer) return;

        containerRef.current.innerHTML = `
          <meting-js
            server="${music.server}"
            type="${music.type}"
            id="${music.id}"
            fixed="false"
            mini="true"
            list-folded="true"
            autoplay="false"
            theme="var(--accent)"
          ></meting-js>
        `;

        const meting = containerRef.current.querySelector("meting-js");
        if (meting) {
          meting.addEventListener("play", () => {}, { once: true });
        }
      } catch (e) {
        console.warn("Music player failed to load", e);
      }
    })();

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
    };
  }, []);

  if (!siteConfig.music.enabled) return null;

  return (
    <div
      ref={containerRef}
      className="mt-3 overflow-hidden rounded-lg [&_.aplayer]:!margin-0 [&_.aplayer-body]:!background-transparent"
      aria-label="Music player"
    />
  );
}
