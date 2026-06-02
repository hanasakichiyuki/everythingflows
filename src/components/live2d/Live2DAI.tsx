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

/* ============================================================
 *  状态机配置
 * ============================================================ */

/** 角色行为状态 */
type CharState = "idle" | "sleepy" | "curious" | "excited" | "shy";

interface StateConfig {
  motion: string;
  expression: string | null;
  followMouse: boolean;
  mouseSensitivity: number; // 1 = 正常, >1 = 增强
  duration: number | null;  // null = 直到外部事件才退出
}

const STATE_CONFIG: Record<CharState, StateConfig> = {
  idle:    { motion: "Scene1", expression: null, followMouse: true,  mouseSensitivity: 1,   duration: null },
  sleepy:  { motion: "keshui", expression: null, followMouse: false, mouseSensitivity: 0,   duration: null },
  curious: { motion: "haoqi",  expression: null, followMouse: true,  mouseSensitivity: 1.5, duration: 5000 },
  excited: { motion: "haoqi",  expression: "cry", followMouse: true,  mouseSensitivity: 1.5, duration: 8000 },
  shy:     { motion: "yaotou", expression: "angry", followMouse: false, mouseSensitivity: 0, duration: 6000 },
};

/** 从列表中随机选取一个不重复的值 */
function pickNotRepeat<T>(list: T[], lastRef: React.MutableRefObject<T | null>): T {
  if (list.length <= 1) return list[0];
  let pick: T;
  do { pick = list[Math.floor(Math.random() * list.length)]; } while (pick === lastRef.current);
  lastRef.current = pick;
  return pick;
}

/* ============================================================
 *  组件
 * ============================================================ */

/** 空闲触发阈值（毫秒） */
const IDLE_THRESHOLD = 15000;
/** 空闲冷却时间 */
const IDLE_COOLDOWN = 60000;
/** 滚动底部冷却 */
const BOTTOM_COOLDOWN = 30000;
/** 音乐切换冷却 */
const MUSIC_COOLDOWN = 15000;
/** 点击冷却 */
const CLICK_COOLDOWN = 400;
/** 连击窗口（毫秒内点击 N 次触发兴奋） */
const COMBO_WINDOW = 5000;
const COMBO_THRESHOLD = 2;
/** 兴奋中点击触发害羞的概率 */
const SHY_PROBABILITY = 0.7;

export function Live2DAI({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [, setMouseProximity] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdleTrigger = useRef(0);
  const lastBottomTrigger = useRef(0);
  const lastMusicTrigger = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivity = useRef(Date.now());
  const lastClickTime = useRef(0);

  // ------ 状态机 ------
  const modelCtrl = useRef<ModelController | null>(null);
  const currentState = useRef<CharState>("idle");
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMotion = useRef<string | null>(null);
  const lastExpr = useRef<string | null>(null);

  // 连击计数
  const clickTimestamps = useRef<number[]>([]);

  /** 应用某个状态：停止旧动作 → 播放新 motion → 设表情 → 设超时 */
  const applyState = useCallback((state: CharState) => {
    const cfg = STATE_CONFIG[state];
    const prevState = currentState.current;
    currentState.current = state;

    // 清除旧超时定时器
    if (stateTimer.current) {
      clearTimeout(stateTimer.current);
      stateTimer.current = null;
    }

    // 停止所有旧动作
    modelCtrl.current?.stopAllMotions();

    // 进入 Sleepy 时：重置鼠标位置，让模型回到中心姿态
    if (state === "sleepy") {
      setMouseX(0);
      setMouseY(0);
    }

    // 从 Sleepy 唤醒时：重置姿态参数和鼠标位置，消除动作残留
    if (prevState === "sleepy" && state !== "sleepy") {
      modelCtrl.current?.resetPose();
      setMouseX(0);
      setMouseY(0);
    }

    // 播放新 motion
    modelCtrl.current?.startMotion(cfg.motion, 0);

    // 设置表情
    if (cfg.expression) {
      modelCtrl.current?.setExpression(cfg.expression);
    } else {
      modelCtrl.current?.resetExpression();
    }

    // 如果有持续时间，到期后回 idle
    if (cfg.duration) {
      stateTimer.current = setTimeout(() => {
        applyState("idle");
      }, cfg.duration);
    }
  }, []);

  const handleControllerReady = useCallback((ctrl: ModelController) => {
    modelCtrl.current = ctrl;
    // 模型加载完成后进入 idle 状态
    applyState("idle");
  }, [applyState]);

  /** 处理点击：根据当前状态决定行为 */
  const handleClick = useCallback(() => {
    const now = Date.now();
    const state = currentState.current;

    // 记录点击时间（清理过期）
    clickTimestamps.current = clickTimestamps.current.filter(t => now - t < COMBO_WINDOW);
    clickTimestamps.current.push(now);

    // 连击检查：在任何状态下，5s 内点击 >= 3 次都触发兴奋
    if (clickTimestamps.current.length >= COMBO_THRESHOLD) {
      clickTimestamps.current = [];
      applyState("excited");
      return;
    }

    switch (state) {
      case "sleepy":
        // 从瞌睡唤醒 → 好奇
        applyState("curious");
        break;

      case "idle":
        applyState("curious");
        break;

      case "curious":
        // 好奇状态中再次点击：重置 5s 超时
        if (stateTimer.current) {
          clearTimeout(stateTimer.current);
          stateTimer.current = null;
        }
        modelCtrl.current?.stopAllMotions();
        modelCtrl.current?.startMotion("haoqi", 0);
        stateTimer.current = setTimeout(() => {
          applyState("idle");
        }, 5000);
        break;

      case "excited":
        // 兴奋中点击：30% 概率害羞
        if (Math.random() < SHY_PROBABILITY) {
          applyState("shy");
        } else {
          // 否则重置兴奋超时
          if (stateTimer.current) {
            clearTimeout(stateTimer.current);
            stateTimer.current = null;
          }
          modelCtrl.current?.stopAllMotions();
          modelCtrl.current?.startMotion("haoqi", 0);
          stateTimer.current = setTimeout(() => {
            applyState("idle");
          }, 8000);
        }
        break;

      case "shy":
        // 害羞中点击：无视，延长害羞时间
        if (stateTimer.current) {
          clearTimeout(stateTimer.current);
          stateTimer.current = null;
        }
        modelCtrl.current?.stopAllMotions();
        modelCtrl.current?.startMotion("yaotou", 0);
        stateTimer.current = setTimeout(() => {
          applyState("idle");
        }, 6000);
        break;
    }
  }, [applyState]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const now = Date.now();
    if (now - lastClickTime.current < CLICK_COOLDOWN) return;
    lastClickTime.current = now;
    lastActivity.current = now;

    handleClick();
  }, [handleClick]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (stateTimer.current) {
        clearTimeout(stateTimer.current);
        stateTimer.current = null;
      }
      if (idleTimer.current) {
        clearInterval(idleTimer.current);
        idleTimer.current = null;
      }
    };
  }, []);

  // 桌面端 / 移动端判断（null=初始尚未检测，避免桌面端先以移动端尺寸渲染）
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // ------ 鼠标 / 触摸追踪（受状态机控制）------
  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastActivity.current = Date.now();
      if (!containerRef.current) return;

      // 当前状态不允许跟随则跳过
      const cfg = STATE_CONFIG[currentState.current];
      if (!cfg.followMouse) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3;
      const sensitivity = cfg.mouseSensitivity;
      const dx = ((e.clientX - centerX) / (window.innerWidth / 2)) * sensitivity;
      const dy = ((e.clientY - centerY) / (window.innerHeight / 2)) * sensitivity;
      setMouseX(dx);
      setMouseY(dy);
      setMouseProximity(1);
    };

    const handleTouchMove = (e: TouchEvent) => {
      lastActivity.current = Date.now();
      if (!containerRef.current || !e.touches[0]) return;

      const cfg = STATE_CONFIG[currentState.current];
      if (!cfg.followMouse) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3;
      const sensitivity = cfg.mouseSensitivity;
      const dx = ((e.touches[0].clientX - centerX) / (window.innerWidth / 2)) * sensitivity;
      const dy = ((e.touches[0].clientY - centerY) / (window.innerHeight / 2)) * sensitivity;
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

  // ------ 空闲检测 → Sleepy ------
  useEffect(() => {
    if (!isDesktop) return;
    idleTimer.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (
        elapsed > IDLE_THRESHOLD &&
        Date.now() - lastIdleTrigger.current > IDLE_COOLDOWN
      ) {
        lastIdleTrigger.current = Date.now();
        applyState("sleepy");
        setMessage("还在看吗？");
      }
    }, 5000);
    return () => {
      if (idleTimer.current) {
        clearInterval(idleTimer.current);
        idleTimer.current = null;
      }
    };
  }, [isDesktop, applyState]);

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

  if (isDesktop === null) return null;

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
                "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
            }),
          }}
          onPointerDown={handlePointerDown}
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
