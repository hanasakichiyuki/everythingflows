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
/** 音乐暂停事件名 */
const MUSIC_PAUSE_EVENT = "live2d:music-pause";

/**
 * 分发音乐切换事件（由 MusicPlayer 调用）
 */
export function notifyMusicChange(songName: string) {
  window.dispatchEvent(
    new CustomEvent(MUSIC_CHANGE_EVENT, { detail: { songName } })
  );
}

/**
 * 分发音乐暂停事件
 */
export function notifyMusicPause() {
  window.dispatchEvent(new CustomEvent(MUSIC_PAUSE_EVENT));
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
  mouseSensitivity: number;
  duration: number | null;
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

/** 从列表中随机选取 */
function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/* ============================================================
 *  台词库 — 安静、克制、低频
 * ============================================================ */

const LINES = {
  /** 首次访问 */
  firstVisit: [
    "这里一直很安静。",
  ],
  /** 回访 */
  welcomeBack: [
    "欢迎回来。",
  ],
  /** 久别重逢 */
  longTimeNoSee: [
    "已经很久没见了。",
    "欢迎回来。",
  ],
  /** 页面停留较久 */
  stayLong: [
    "还在看吗？",
    "今天也睡不着？",
    "时间好像流得很慢。",
    "你已经停留很久了。",
  ],
  /** 长时间无操作 */
  idle: [
    "……睡着了吗？",
    "我还在。",
  ],
  /** 快速滚动 */
  fastScroll: [
    "慢一点。",
  ],
  /** 滚动到底部 */
  bottom: [
    "已经没有更多内容了。",
    "河流已经流到尽头了吗？",
    "再往下，就什么都没有了。",
  ],
  /** 回到顶部 */
  top: [
    "又回到最初了。",
  ],
  /** 深夜 */
  lateNight: [
    "凌晨的互联网很安静。",
    "这个时间，还有人在。",
    "又是深夜。",
  ],
  /** 连续深夜访问 */
  consecutiveLateNight: [
    "你最近总是在凌晨出现。",
  ],
  /** 音乐切换 */
  musicChange: [
    "这首很好听。",
    "我记得这段旋律。",
  ],
  /** 音乐暂停 */
  musicPause: [
    "怎么停下来了？",
  ],
  /** 鼠标靠近 */
  mouseNearby: [
    "……",
  ],
  /** 鼠标靠近低概率 */
  mouseNearbyRare: [
    "不要一直盯着我看。",
  ],
  /** 鼠标长时间停留角色身上 */
  mouseHoverLong: [
    "有点近了。",
  ],
  /** 频繁切换页面 */
  pageSwitchFrequent: [
    "今天好像很焦躁。",
  ],
  /** 页面加载慢 */
  slowLoad: [
    "网络有点慢。",
  ],
  /** 关闭页面前 */
  beforeLeave: [
    "晚安。",
    "下次见。",
  ],
  /** 截图 */
  screenshot: [
    "你在保存什么？",
  ],
};

/* ============================================================
 *  冷却配置 — 克制、低频
 * ============================================================ */

/** 空闲触发阈值（毫秒） */
const IDLE_THRESHOLD = 20000;
/** 空闲冷却时间 */
const IDLE_COOLDOWN = 90000;
/** 滚动底部冷却 */
const BOTTOM_COOLDOWN = 60000;
/** 音乐切换冷却 */
const MUSIC_COOLDOWN = 30000;
/** 点击冷却 */
const CLICK_COOLDOWN = 400;
/** 连击窗口 */
const COMBO_WINDOW = 5000;
const COMBO_THRESHOLD = 2;
/** 兴奋中点击触发害羞的概率 */
const SHY_PROBABILITY = 0.7;
/** 页面停留台词冷却 */
const STAY_COOLDOWN = 40000;
/** 快速滚动冷却 */
const FAST_SCROLL_COOLDOWN = 30000;
/** 回到顶部冷却 */
const TOP_COOLDOWN = 30000;
/** 深夜台词冷却 */
const LATE_NIGHT_COOLDOWN = 120000;
/** 鼠标靠近台词冷却 */
const MOUSE_NEARBY_COOLDOWN = 20000;
/** 鼠标长时间停留冷却 */
const MOUSE_HOVER_LONG_COOLDOWN = 45000;
/** 频繁切换页面冷却 */
const PAGE_SWITCH_COOLDOWN = 60000;
/** 关闭页面前冷却 */
const BEFORE_LEAVE_COOLDOWN = 30000;
/** 截图冷却 */
const SCREENSHOT_COOLDOWN = 30000;

/* ============================================================
 *  组件
 * ============================================================ */

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

  // ------ 交互冷却追踪 ------
  const lastStayTrigger = useRef(0);
  const lastFastScrollTrigger = useRef(0);
  const lastTopTrigger = useRef(0);
  const lastLateNightTrigger = useRef(0);
  const lastMouseNearbyTrigger = useRef(0);
  const lastMouseHoverLongTrigger = useRef(0);
  const lastPageSwitchTrigger = useRef(0);
  const lastBeforeLeaveTrigger = useRef(0);
  const lastScreenshotTrigger = useRef(0);

  // ------ 鼠标追踪 ------
  const mouseNearContainer = useRef(false);
  const mouseHoverStartTime = useRef(0);

  // ------ 页面切换追踪 ------
  const pageSwitchCount = useRef(0);
  const pageSwitchResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------ 本地存储 ------
  const storageRef = useRef<Storage | null>(null);

  useEffect(() => {
    try {
      storageRef.current = window.localStorage;
    } catch {
      // localStorage 不可用
    }
  }, []);

  /** 安全地发送消息 */
  const say = useCallback((text: string) => {
    setMessage(text);
  }, []);

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

    // 连击检查：在任何状态下，5s 内点击 >= 2 次都触发兴奋
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
        // 兴奋中点击：70% 概率害羞
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
      if (pageSwitchResetTimer.current) {
        clearTimeout(pageSwitchResetTimer.current);
        pageSwitchResetTimer.current = null;
      }
    };
  }, []);

  // 桌面端 / 移动端判断
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

      // 检测鼠标是否靠近角色
      const dist = Math.sqrt(
        (e.clientX - (rect.left + rect.width / 2)) ** 2 +
        (e.clientY - (rect.top + rect.height / 2)) ** 2
      );
      const wasNear = mouseNearContainer.current;
      mouseNearContainer.current = dist < 200;

      if (mouseNearContainer.current && !wasNear) {
        mouseHoverStartTime.current = Date.now();
      }
      if (!mouseNearContainer.current) {
        mouseHoverStartTime.current = 0;
      }
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

  // ------ 鼠标靠近 / 长时间停留检测 ------
  useEffect(() => {
    if (!isDesktop) return;

    const checkMouseProximity = setInterval(() => {
      if (!mouseNearContainer.current) return;

      const now = Date.now();
      const hoverDuration = now - mouseHoverStartTime.current;

      // 长时间停留角色身上
      if (
        hoverDuration > MOUSE_HOVER_LONG_COOLDOWN &&
        now - lastMouseHoverLongTrigger.current > MOUSE_HOVER_LONG_COOLDOWN * 2
      ) {
        lastMouseHoverLongTrigger.current = now;
        say(pickRandom(LINES.mouseHoverLong));
        return;
      }

      // 鼠标靠近低概率台词
      if (now - lastMouseNearbyTrigger.current > MOUSE_NEARBY_COOLDOWN) {
        if (Math.random() < 0.15) {
          lastMouseNearbyTrigger.current = now;
          say(pickRandom(LINES.mouseNearbyRare));
        }
      }
    }, 3000);

    return () => clearInterval(checkMouseProximity);
  }, [isDesktop, say]);

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
        say(pickRandom(LINES.idle));
      }
    }, 5000);
    return () => {
      if (idleTimer.current) {
        clearInterval(idleTimer.current);
        idleTimer.current = null;
      }
    };
  }, [isDesktop, applyState, say]);

  // ------ 页面停留较久台词 ------
  useEffect(() => {
    if (!isDesktop) return;

    const checkStay = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (
        elapsed > 25000 &&
        Date.now() - lastStayTrigger.current > STAY_COOLDOWN
      ) {
        lastStayTrigger.current = Date.now();
        say(pickRandom(LINES.stayLong));
      }
    }, 10000);

    return () => clearInterval(checkStay);
  }, [isDesktop, say]);

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
        if ((hour >= 0 && hour < 5) || hour >= 23) {
          if (Date.now() - lastLateNightTrigger.current > LATE_NIGHT_COOLDOWN) {
            lastLateNightTrigger.current = Date.now();

            // 检查是否连续深夜访问
            const storage = storageRef.current;
            if (storage) {
              const lateNightDays = JSON.parse(storage.getItem("ef_late_night_days") || "[]");
              const today = new Date().toDateString();
              if (!lateNightDays.includes(today)) {
                lateNightDays.push(today);
              }
              // 保留最近 7 天
              const recentDays = lateNightDays.slice(-7);
              storage.setItem("ef_late_night_days", JSON.stringify(recentDays));

              if (recentDays.length >= 3) {
                say(pickRandom(LINES.consecutiveLateNight));
                return;
              }
            }

            say(pickRandom(LINES.lateNight));
          }
        }

        scheduleNextCheck();
      }, delay);
    };

    scheduleNextCheck();
    return () => clearTimeout(timeout);
  }, [isDesktop, say]);

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
        say(pickRandom(LINES.bottom));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDesktop, say]);

  // ------ 快速滚动检测 ------
  useEffect(() => {
    if (!isDesktop) return;

    let lastScrollY = window.scrollY;
    let scrollAccumulator = 0;

    const handleScroll = () => {
      const now = Date.now();
      const delta = Math.abs(window.scrollY - lastScrollY);
      scrollAccumulator += delta;
      lastScrollY = window.scrollY;

      // 每 300ms 检查一次滚动速度
      if (scrollAccumulator > 800) {
        if (now - lastFastScrollTrigger.current > FAST_SCROLL_COOLDOWN) {
          lastFastScrollTrigger.current = now;
          say(pickRandom(LINES.fastScroll));
        }
        scrollAccumulator = 0;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDesktop, say]);

  // ------ 回到顶部检测 ------
  useEffect(() => {
    if (!isDesktop) return;

    let wasNearTop = false;

    const handleScroll = () => {
      const nearTop = window.scrollY < 100;
      if (nearTop && !wasNearTop) {
        wasNearTop = true;
        if (Date.now() - lastTopTrigger.current > TOP_COOLDOWN) {
          lastTopTrigger.current = Date.now();
          say(pickRandom(LINES.top));
        }
      }
      if (!nearTop) {
        wasNearTop = false;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDesktop, say]);

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
        say(pickRandom(LINES.musicChange));
      }
    };
    window.addEventListener(MUSIC_CHANGE_EVENT, handleMusicChange);
    return () =>
      window.removeEventListener(MUSIC_CHANGE_EVENT, handleMusicChange);
  }, [isDesktop, say]);

  // ------ 音乐暂停 ------
  useEffect(() => {
    if (!isDesktop) return;
    const handleMusicPause = () => {
      if (Date.now() - lastMusicTrigger.current > MUSIC_COOLDOWN) {
        lastMusicTrigger.current = Date.now();
        say(pickRandom(LINES.musicPause));
      }
    };
    window.addEventListener(MUSIC_PAUSE_EVENT, handleMusicPause);
    return () =>
      window.removeEventListener(MUSIC_PAUSE_EVENT, handleMusicPause);
  }, [isDesktop, say]);

  // ------ 频繁切换页面检测 ------
  useEffect(() => {
    if (!isDesktop) return;

    const handleRouteChange = () => {
      const now = Date.now();
      pageSwitchCount.current++;

      // 重置计数器
      if (pageSwitchResetTimer.current) {
        clearTimeout(pageSwitchResetTimer.current);
      }
      pageSwitchResetTimer.current = setTimeout(() => {
        pageSwitchCount.current = 0;
      }, 10000);

      // 10s 内切换 >= 4 次
      if (
        pageSwitchCount.current >= 4 &&
        now - lastPageSwitchTrigger.current > PAGE_SWITCH_COOLDOWN
      ) {
        lastPageSwitchTrigger.current = now;
        pageSwitchCount.current = 0;
        say(pickRandom(LINES.pageSwitchFrequent));
      }
    };

    window.addEventListener("live2d:route-change", handleRouteChange);
    return () => window.removeEventListener("live2d:route-change", handleRouteChange);
  }, [isDesktop, say]);

  // ------ 关闭页面前 ------
  useEffect(() => {
    if (!isDesktop) return;

    const handleBeforeUnload = () => {
      if (Date.now() - lastBeforeLeaveTrigger.current > BEFORE_LEAVE_COOLDOWN) {
        lastBeforeLeaveTrigger.current = Date.now();
        // 使用 sendBeacon 确保消息能发送（虽然可能看不到）
        try {
          storageRef.current?.setItem("ef_last_message", pickRandom(LINES.beforeLeave));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDesktop]);

  // ------ 截图检测 ------
  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen 或 Cmd+Shift+3 (Mac)
      if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey && e.key === "3")) {
        const now = Date.now();
        if (now - lastScreenshotTrigger.current > SCREENSHOT_COOLDOWN) {
          lastScreenshotTrigger.current = now;
          say(pickRandom(LINES.screenshot));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop, say]);

  // ------ 首次访问 / 回访 ------
  useEffect(() => {
    if (!isDesktop) return;

    const storage = storageRef.current;
    if (!storage) return;

    const lastVisit = storage.getItem("ef_last_visit");
    const now = Date.now();
    storage.setItem("ef_last_visit", String(now));

    if (!lastVisit) {
      // 首次访问
      setTimeout(() => {
        say(pickRandom(LINES.firstVisit));
      }, 3000);
    } else {
      const daysSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastVisit > 3) {
        // 久别重逢
        setTimeout(() => {
          say(pickRandom(LINES.longTimeNoSee));
        }, 3000);
      } else {
        // 回访
        setTimeout(() => {
          say(pickRandom(LINES.welcomeBack));
        }, 3000);
      }
    }
  }, [isDesktop, say]);

  // ------ 关闭页面前显示上次留言 ------
  useEffect(() => {
    if (!isDesktop) return;

    const storage = storageRef.current;
    if (!storage) return;

    const lastMessage = storage.getItem("ef_last_message");
    if (lastMessage) {
      // 下次访问时显示
      setTimeout(() => {
        // 不显示，只存储用于下次
      }, 100);
      storage.removeItem("ef_last_message");
    }
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
      className="pointer-events-none fixed bottom-0 left-0 z-10 select-none"
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
