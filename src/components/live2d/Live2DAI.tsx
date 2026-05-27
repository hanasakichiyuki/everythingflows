"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Live2DSpeechBubble } from "./Live2DSpeechBubble";

// 动态导入 PIXI 组件，禁止 SSR
const Live2DCanvas = dynamic(
  () => import("./Live2DCanvas").then((m) => m.Live2DCanvas),
  { ssr: false }
);

/** 音乐切换事件名 */
const MUSIC_CHANGE_EVENT = "live2d:music-change";

/**
 * 分发音乐切换事件（由 MusicPlayer 调用）
 */
export function notifyMusicChange(songName: string) {
  window.dispatchEvent(
    new CustomEvent(MUSIC_CHANGE_EVENT, { detail: { songName } })
  );
}

/** 空闲触发阈值（毫秒） */
const IDLE_THRESHOLD = 30000;
/** 空闲冷却时间 */
const IDLE_COOLDOWN = 60000;
/** 滚动底部冷却 */
const BOTTOM_COOLDOWN = 30000;
/** 音乐切换冷却 */
const MUSIC_COOLDOWN = 15000;

export function Live2DAI({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [, setMouseProximity] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdleTrigger = useRef(0);
  const lastBottomTrigger = useRef(0);
  const lastMusicTrigger = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setInterval>>();
  const lastActivity = useRef(Date.now());

  // 移动端不渲染，避免冗余 effects 执行
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // ------ 鼠标追踪 ------
  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastActivity.current = Date.now();

      if (!containerRef.current) return;
      // 以 Live2D 容器中心（人物头部位置）为基准
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3; // 头部大约在容器上方 30% 处
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);

      setMouseX(dx);
      setMouseY(dy);
      setMouseProximity(1);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDesktop]);

  // ------ 空闲检测 ------
  useEffect(() => {
    if (!isDesktop) return;
    idleTimer.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (
        elapsed > IDLE_THRESHOLD &&
        Date.now() - lastIdleTrigger.current > IDLE_COOLDOWN
      ) {
        lastIdleTrigger.current = Date.now();
        setMessage("还在看吗？");
      }
    }, 5000);
    return () => clearInterval(idleTimer.current);
  }, [isDesktop]);

  // ------ 深夜检测 ------
  useEffect(() => {
    if (!isDesktop) return;

    let timeout: NodeJS.Timeout;

    const scheduleNextCheck = () => {
      const now = new Date();

      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);

      const delay = nextMinute.getTime() - now.getTime();

      timeout = setTimeout(() => {
        const hour = new Date().getHours();

        if (hour >= 23 || hour < 5) {
          setMessage("夜晚的互联网很安静。");
        }

        scheduleNextCheck();
      }, delay);
    };

    scheduleNextCheck();

    return () => clearTimeout(timeout);
  }, [isDesktop]);

  // ------ 滚动到底部 ------
  useEffect(() => {
    if (!isDesktop) return;
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 120;
      if (
        nearBottom &&
        Date.now() - lastBottomTrigger.current > BOTTOM_COOLDOWN
      ) {
        lastBottomTrigger.current = Date.now();
        setMessage("已经没有更多内容了。");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDesktop]);

  // ------ 音乐切换 ------
  useEffect(() => {
    if (!isDesktop) return;
    const handleMusicChange = (e: Event) => {
      const { songName } = (e as CustomEvent).detail || {};
      if (
        songName &&
        Date.now() - lastMusicTrigger.current > MUSIC_COOLDOWN
      ) {
        lastMusicTrigger.current = Date.now();
        setMessage("这首很好听。");
      }
    };
    window.addEventListener(MUSIC_CHANGE_EVENT, handleMusicChange);
    return () =>
      window.removeEventListener(MUSIC_CHANGE_EVENT, handleMusicChange);
  }, [isDesktop]);

  // ------ 消息消失回调 ------
  const handleDismiss = useCallback(() => {
    setMessage(null);
  }, []);

  if (!isDesktop) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-0 left-0 z-20 transition-all duration-300"
      style={{
        marginLeft: sidebarCollapsed ? "0px" : "170px",
      }}
    >
      <div className="relative flex flex-col items-center">
        {/* 气泡 */}
        <Live2DSpeechBubble message={message} onDismiss={handleDismiss} />

        {/* Live2D 模型 — 纯上半身，下半截透明消失 */}
        <div
          className="pointer-events-none"
          style={{
            width: 280,
            height: 420,
            maskImage:
              "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
          }}
        >
          <Live2DCanvas
            disabled={!isDesktop}
            mouseX={mouseX}
            mouseY={mouseY}
            onLoad={() => { }}
            onError={(err) => {
              console.error("Live2D error:", err);
            }}
          />
        </div>
      </div>
    </div>
  );
}