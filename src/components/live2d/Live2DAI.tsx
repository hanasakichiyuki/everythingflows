"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Live2DSpeechBubble } from "./Live2DSpeechBubble";
import type { ModelController } from "./Live2DCanvas";

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

/** 从列表中随机选取一个不重复的值 */
function pickNotRepeat<T>(list: T[], lastRef: React.MutableRefObject<T | null>): T {
  if (list.length <= 1) return list[0];
  let pick: T;
  do { pick = list[Math.floor(Math.random() * list.length)]; } while (pick === lastRef.current);
  lastRef.current = pick;
  return pick;
}

const motions = ["haoqi", "yaotou", "keshui", "Scene1"];
const exps = ["cry", "angry"];
const CLICK_COOLDOWN = 400;
const HOLD_INTERVAL = 2500;
const EXPR_DURATION = 3000; // 表情持续 ms，到时间自动复位

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

  // ------ 点击互动（伪拖动：按住触发，不动位置）------
  const modelCtrl = useRef<ModelController | null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval>>();
  const exprTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastMotion = useRef<string | null>(null);
  const lastExpr = useRef<string | null>(null);
  const lastClickRef = useRef(0);

  const handleControllerReady = useCallback((ctrl: ModelController) => {
    modelCtrl.current = ctrl;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const now = Date.now();
    if (now - lastClickRef.current < CLICK_COOLDOWN) return;
    lastClickRef.current = now;

    // 表情只在按下时设一次，3 秒后自动复位
    if (exprTimer.current) clearTimeout(exprTimer.current);
    modelCtrl.current?.setExpression(pickNotRepeat(exps, lastExpr));
    exprTimer.current = setTimeout(() => modelCtrl.current?.resetExpression(), EXPR_DURATION);

    modelCtrl.current?.stopAllMotions();
    modelCtrl.current?.startMotion(pickNotRepeat(motions, lastMotion), 0);

    // 持续按住时只切换动作，不再重复设表情
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => {
      modelCtrl.current?.stopAllMotions();
      modelCtrl.current?.startMotion(pickNotRepeat(motions, lastMotion), 0);
    }, HOLD_INTERVAL);
  }, [exps, motions, CLICK_COOLDOWN, HOLD_INTERVAL, EXPR_DURATION]);

  const handlePointerUp = useCallback(() => {
    modelCtrl.current?.resetExpression();
    if (exprTimer.current) { clearTimeout(exprTimer.current); exprTimer.current = undefined; }
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = undefined; }
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (exprTimer.current) { clearTimeout(exprTimer.current); exprTimer.current = undefined; }
      if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = undefined; }
    };
  }, []);

  // 桌面端 / 移动端判断（用于 UI 适配，不再阻止渲染）
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // ------ 鼠标 / 触摸追踪 ------
  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastActivity.current = Date.now();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      setMouseX(dx);
      setMouseY(dy);
      setMouseProximity(1);
    };

    const handleTouchMove = (e: TouchEvent) => {
      lastActivity.current = Date.now();
      if (!containerRef.current || !e.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3;
      const dx = (e.touches[0].clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.touches[0].clientY - centerY) / (window.innerHeight / 2);
      setMouseX(dx);
      setMouseY(dy);
      setMouseProximity(1);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
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

  // 移动端缩小尺寸
  const containerW = isDesktop ? 280 : 180;
  const containerH = isDesktop ? 420 : 280;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-0 left-0 z-20 select-none"
      style={{
        marginLeft: sidebarCollapsed ? "0px" : isDesktop ? "170px" : "0px",
      }}
    >
      <div className="relative flex flex-col items-center">
        {/* 气泡 */}
        <Live2DSpeechBubble message={message} onDismiss={handleDismiss} />

        {/* Live2D 模型 — 移动端下半截透明消失 */}
        <div
          className="pointer-events-auto"
          style={{
            width: containerW,
            height: containerH,
            cursor: "pointer",
            touchAction: "none",
            ...(isDesktop ? {} : {
              maskImage:
                "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
            }),
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <Live2DCanvas
            isMobile={!isDesktop}
            mouseX={mouseX}
            mouseY={mouseY}
            onControllerReady={handleControllerReady}
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