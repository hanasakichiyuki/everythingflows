/**
 * Live2D Widget — 外挂式独立模块。
 *
 * 特点：
 *  - 不依赖 React，React 只负责挂载容器
 *  - 自己创建 DOM 元素（fixed layer）
 *  - 使用 requestIdleCallback 延迟初始化
 *  - 分阶段初始化，阶段间 await requestAnimationFrame
 *  - mousemove 不使用 setState，使用 ref 对象
 *  - 所有事件监听使用 passive
 *  - 页面滚动不影响 Live2D
 *  - 初始化失败不影响页面
 */

import { Live2DEngine, type ModelController, type MouseState } from "./engine";

/* ============================================================
 *  常量
 * ============================================================ */

const MUSIC_CHANGE_EVENT = "live2d:music-change";
const MUSIC_PAUSE_EVENT = "live2d:music-pause";
const ROUTE_CHANGE_EVENT = "live2d:route-change";

const W_DESKTOP = 280;
const H_DESKTOP = 420;
const W_MOBILE = 180;
const H_MOBILE = 280;

const IDLE_THRESHOLD = 20000;
const IDLE_COOLDOWN = 90000;
const BOTTOM_COOLDOWN = 60000;
const MUSIC_COOLDOWN = 30000;
const CLICK_COOLDOWN = 400;
const COMBO_WINDOW = 5000;
const COMBO_THRESHOLD = 2;
const SHY_PROBABILITY = 0.7;
const STAY_COOLDOWN = 40000;
const FAST_SCROLL_COOLDOWN = 30000;
const TOP_COOLDOWN = 30000;
const LATE_NIGHT_COOLDOWN = 120000;
const MOUSE_NEARBY_COOLDOWN = 20000;
const MOUSE_HOVER_LONG_COOLDOWN = 45000;
const PAGE_SWITCH_COOLDOWN = 60000;
const BEFORE_LEAVE_COOLDOWN = 30000;
const SCREENSHOT_COOLDOWN = 30000;
const DISPLAY_DURATION = 4500;

/* ============================================================
 *  类型
 * ============================================================ */

type CharState = "idle" | "sleepy" | "curious" | "excited" | "shy";

interface StateConfig {
  motion: string;
  expression: string | null;
  followMouse: boolean;
  mouseSensitivity: number;
  duration: number | null;
}

/* ============================================================
 *  台词库
 * ============================================================ */

const LINES = {
  firstVisit: ["这里一直很安静。"],
  welcomeBack: ["欢迎回来。"],
  longTimeNoSee: ["已经很久没见了。", "欢迎回来。"],
  stayLong: ["还在看吗？", "今天也睡不着？", "时间好像流得很慢。", "你已经停留很久了。"],
  idle: ["……睡着了吗？", "我还在。"],
  fastScroll: ["慢一点。"],
  bottom: ["已经没有更多内容了。", "河流已经流到尽头了吗？", "再往下，就什么都没有了。"],
  top: ["又回到最初了。"],
  lateNight: ["凌晨的互联网很安静。", "这个时间，还有人在。", "又是深夜。"],
  consecutiveLateNight: ["你最近总是在凌晨出现。"],
  musicChange: ["这首很好听。", "我记得这段旋律。"],
  musicPause: ["怎么停下来了？"],
  mouseNearby: ["……"],
  mouseNearbyRare: ["不要一直盯着我看。"],
  mouseHoverLong: ["有点近了。"],
  pageSwitchFrequent: ["今天好像很焦躁。"],
  slowLoad: ["网络有点慢。"],
  beforeLeave: ["晚安。", "下次见。"],
  screenshot: ["你在保存什么？"],
};

/* ============================================================
 *  状态机配置
 * ============================================================ */

const STATE_CONFIG: Record<CharState, StateConfig> = {
  idle:    { motion: "Scene1", expression: null, followMouse: true,  mouseSensitivity: 1,   duration: null },
  sleepy:  { motion: "keshui", expression: null, followMouse: false, mouseSensitivity: 0,   duration: null },
  curious: { motion: "haoqi",  expression: null, followMouse: true,  mouseSensitivity: 1.5, duration: 5000 },
  excited: { motion: "haoqi",  expression: "cry", followMouse: true,  mouseSensitivity: 1.5, duration: 8000 },
  shy:     { motion: "yaotou", expression: "angry", followMouse: false, mouseSensitivity: 0, duration: 6000 },
};

/* ============================================================
 *  工具函数
 * ============================================================ */

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function pickNotRepeat<T>(list: T[], last: T | null): T {
  if (list.length <= 1) return list[0];
  let pick: T;
  do { pick = pickRandom(list); } while (pick === last);
  return pick;
}

/* ============================================================
 *  Widget
 * ============================================================ */

export class Live2DWidget {
  // DOM
  private root: HTMLDivElement | null = null;
  private bubbleContainer: HTMLDivElement | null = null;
  private engine: Live2DEngine | null = null;

  // 状态
  private destroyed = false;
  private isDesktop = false;
  private sidebarCollapsed = false;
  private modelCtrl: ModelController | null = null;

  // 状态机
  private currentState: CharState = "idle";
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private prevState: CharState = "idle";

  // 鼠标
  private mouse: MouseState = { x: 0, y: 0 };
  private mouseNearContainer = false;
  private mouseHoverStartTime = 0;

  // 冷却追踪
  private lastActivity = Date.now();
  private lastClickTime = 0;
  private lastIdleTrigger = 0;
  private lastBottomTrigger = 0;
  private lastMusicTrigger = 0;
  private lastStayTrigger = 0;
  private lastFastScrollTrigger = 0;
  private lastTopTrigger = 0;
  private lastLateNightTrigger = 0;
  private lastMouseNearbyTrigger = 0;
  private lastMouseHoverLongTrigger = 0;
  private lastPageSwitchTrigger = 0;
  private lastBeforeLeaveTrigger = 0;
  private lastScreenshotTrigger = 0;

  // 连击
  private clickTimestamps: number[] = [];

  // 定时器
  private idleInterval: ReturnType<typeof setInterval> | null = null;
  private stayInterval: ReturnType<typeof setInterval> | null = null;
  private lateNightTimeout: ReturnType<typeof setTimeout> | null = null;
  private mouseProximityInterval: ReturnType<typeof setInterval> | null = null;
  private pageSwitchTimer: ReturnType<typeof setTimeout> | null = null;
  private pageSwitchCount = 0;

  // 滚动
  private wasNearTop = false;
  private lastScrollY = 0;
  private scrollAccumulator = 0;

  // 本地存储
  private storage: Storage | null = null;

  // 消息
  private messages: Array<{ id: number; text: string; el: HTMLDivElement }> = [];
  private nextMsgId = 0;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  // 绑定的事件处理器（用于正确移除）
  private boundHandlers: Map<string, EventListener> = new Map();

  constructor(options: { sidebarCollapsed?: boolean } = {}) {
    this.sidebarCollapsed = options.sidebarCollapsed ?? false;
  }

  /* ============================================================
   *  初始化
   * ============================================================ */

  async init(): Promise<void> {
    if (this.destroyed) return;

    try {
      this.storage = (() => {
        try { return window.localStorage; } catch { return null; }
      })();

      // 检测桌面端
      this.isDesktop = window.innerWidth >= 768;

      // 阶段 1：创建 DOM 容器
      this.createDOM();
      await this.rafYield();
      if (this.destroyed) return;

      // 阶段 2：使用 requestIdleCallback 延迟初始化引擎
      await this.idleYield();
      if (this.destroyed) return;

      // 阶段 3：加载引擎
      await this.initEngine();
      if (this.destroyed) return;

      // 阶段 4：绑定事件
      this.bindEvents();
      if (this.destroyed) return;

      // 阶段 5：首次访问台词
      this.showWelcomeMessage();
    } catch (err) {
      console.error("Live2D widget init failed:", err);
      // 初始化失败不影响页面
    }
  }

  /* ============================================================
   *  CSS 注入
   * ============================================================ */

  private injectStyles(): void {
    if (document.getElementById("live2d-widget-styles")) return;

    const style = document.createElement("style");
    style.id = "live2d-widget-styles";
    style.textContent = `
      @keyframes live2d-bubble-in {
        from { opacity: 0; transform: translateY(6px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes live2d-bubble-out {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: translateY(-4px) scale(0.96); }
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
   *  DOM 创建
   * ============================================================ */

  private createDOM(): void {
    // 注入 CSS 动画
    this.injectStyles();

    // 根容器 — fixed layer，独立于页面流
    const root = document.createElement("div");
    root.id = "live2d-widget-root";
    root.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      z-index: 10;
      pointer-events: none;
      user-select: none;
      contain: layout paint;
      transform: translateZ(0);
    `;
    this.root = root;

    // 内容容器
    const inner = document.createElement("div");
    inner.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    root.appendChild(inner);

    // 气泡容器
    const bubble = document.createElement("div");
    bubble.id = "live2d-bubble-container";
    bubble.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;
    inner.appendChild(bubble);
    this.bubbleContainer = bubble;

    // 引擎容器
    const engineContainer = document.createElement("div");
    engineContainer.id = "live2d-engine-container";
    engineContainer.style.cssText = `
      pointer-events: auto;
      cursor: pointer;
      touch-action: none;
    `;
    inner.appendChild(engineContainer);

    document.body.appendChild(root);
    this.updateLayout();
  }

  private updateLayout(): void {
    if (!this.root) return;
    const w = this.isDesktop ? W_DESKTOP : W_MOBILE;
    const h = this.isDesktop ? H_DESKTOP : H_MOBILE;
    const ml = this.sidebarCollapsed ? 0 : this.isDesktop ? 170 : 0;

    this.root.style.marginLeft = `${ml}px`;

    const engineContainer = this.root.querySelector("#live2d-engine-container") as HTMLDivElement;
    if (engineContainer) {
      engineContainer.style.width = `${w}px`;
      engineContainer.style.height = `${h}px`;
      if (!this.isDesktop) {
        engineContainer.style.maskImage =
          "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)";
        engineContainer.style.webkitMaskImage =
          "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)";
      } else {
        engineContainer.style.maskImage = "";
        engineContainer.style.webkitMaskImage = "";
      }
    }
  }

  /* ============================================================
   *  引擎初始化
   * ============================================================ */

  private async initEngine(): Promise<void> {
    const engineContainer = this.root?.querySelector("#live2d-engine-container") as HTMLDivElement;
    if (!engineContainer) return;

    this.engine = new Live2DEngine({
      container: engineContainer,
      isMobile: !this.isDesktop,
      onControllerReady: (ctrl) => {
        this.modelCtrl = ctrl;
        this.applyState("idle");
      },
      onError: (err) => {
        console.error("Live2D engine error:", err);
      },
    });

    await this.engine.init();
  }

  /* ============================================================
   *  事件绑定
   * ============================================================ */

  private bindEvents(): void {
    // mousemove — passive，不触发 setState
    const onMouseMove = this.createMouseMoveHandler();
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    this.boundHandlers.set("mousemove", onMouseMove);

    // touchmove — passive
    const onTouchMove = this.createTouchMoveHandler();
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    this.boundHandlers.set("touchmove", onTouchMove);

    // pointerdown — 点击交互
    const engineContainer = this.root?.querySelector("#live2d-engine-container");
    const onPointerDown = this.createPointerDownHandler();
    if (engineContainer) {
      engineContainer.addEventListener("pointerdown", onPointerDown);
      this.boundHandlers.set("pointerdown", onPointerDown);
    }

    // resize
    const onResize = this.createResizeHandler();
    window.addEventListener("resize", onResize);
    this.boundHandlers.set("resize", onResize);

    // scroll — passive
    const onScroll = this.createScrollHandler();
    window.addEventListener("scroll", onScroll, { passive: true });
    this.boundHandlers.set("scroll", onScroll);

    // 音乐事件
    const onMusicChange = this.createMusicChangeHandler();
    window.addEventListener(MUSIC_CHANGE_EVENT, onMusicChange);
    this.boundHandlers.set("musicChange", onMusicChange);

    const onMusicPause = this.createMusicPauseHandler();
    window.addEventListener(MUSIC_PAUSE_EVENT, onMusicPause);
    this.boundHandlers.set("musicPause", onMusicPause);

    // 路由切换
    const onRouteChange = this.createRouteChangeHandler();
    window.addEventListener(ROUTE_CHANGE_EVENT, onRouteChange);
    this.boundHandlers.set("routeChange", onRouteChange);

    // beforeunload
    const onBeforeUnload = this.createBeforeUnloadHandler();
    window.addEventListener("beforeunload", onBeforeUnload);
    this.boundHandlers.set("beforeunload", onBeforeUnload);

    // 截图检测
    const onKeyDown = this.createKeyDownHandler();
    window.addEventListener("keydown", onKeyDown);
    this.boundHandlers.set("keydown", onKeyDown);

    // 定时器
    this.startTimers();
  }

  /* ============================================================
   *  事件处理器工厂
   * ============================================================ */

  private createMouseMoveHandler(): EventListener {
    return (e: Event) => {
      const ev = e as MouseEvent;
      this.lastActivity = Date.now();

      const cfg = STATE_CONFIG[this.currentState];
      if (!cfg.followMouse) return;

      if (!this.root) return;
      const engineContainer = this.root.querySelector("#live2d-engine-container");
      if (!engineContainer) return;

      const rect = engineContainer.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3;
      const sensitivity = cfg.mouseSensitivity;
      const dx = ((ev.clientX - centerX) / (window.innerWidth / 2)) * sensitivity;
      const dy = ((ev.clientY - centerY) / (window.innerHeight / 2)) * sensitivity;

      // 直接更新引擎的鼠标状态（ref 对象，不触发 React）
      this.mouse.x = dx;
      this.mouse.y = dy;
      if (this.engine) {
        this.engine.mouse.x = dx;
        this.engine.mouse.y = dy;
      }

      // 检测鼠标是否靠近角色
      const dist = Math.sqrt(
        (ev.clientX - (rect.left + rect.width / 2)) ** 2 +
        (ev.clientY - (rect.top + rect.height / 2)) ** 2
      );
      const wasNear = this.mouseNearContainer;
      this.mouseNearContainer = dist < 200;

      if (this.mouseNearContainer && !wasNear) {
        this.mouseHoverStartTime = Date.now();
      }
      if (!this.mouseNearContainer) {
        this.mouseHoverStartTime = 0;
      }
    };
  }

  private createTouchMoveHandler(): EventListener {
    return (e: Event) => {
      const ev = e as TouchEvent;
      this.lastActivity = Date.now();
      if (!this.root || !ev.touches[0]) return;

      const cfg = STATE_CONFIG[this.currentState];
      if (!cfg.followMouse) return;

      const engineContainer = this.root.querySelector("#live2d-engine-container");
      if (!engineContainer) return;

      const rect = engineContainer.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.3;
      const sensitivity = cfg.mouseSensitivity;
      const dx = ((ev.touches[0].clientX - centerX) / (window.innerWidth / 2)) * sensitivity;
      const dy = ((ev.touches[0].clientY - centerY) / (window.innerHeight / 2)) * sensitivity;

      this.mouse.x = dx;
      this.mouse.y = dy;
      if (this.engine) {
        this.engine.mouse.x = dx;
        this.engine.mouse.y = dy;
      }
    };
  }

  private createPointerDownHandler(): EventListener {
    return (e: Event) => {
      const ev = e as PointerEvent;
      (ev.target as HTMLElement).setPointerCapture(ev.pointerId);

      const now = Date.now();
      if (now - this.lastClickTime < CLICK_COOLDOWN) return;
      this.lastClickTime = now;
      this.lastActivity = now;

      this.handleClick();
    };
  }

  private createResizeHandler(): EventListener {
    return () => {
      const wasDesktop = this.isDesktop;
      this.isDesktop = window.innerWidth >= 768;
      this.updateLayout();

      if (wasDesktop !== this.isDesktop) {
        this.engine?.resize(!this.isDesktop);
      }
    };
  }

  private createScrollHandler(): EventListener {
    // 初始化 lastScrollY 避免首次滚动产生巨大 delta
    this.lastScrollY = window.scrollY;

    return () => {
      if (!this.isDesktop) return;

      // 底部检测
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 120;
      if (nearBottom && Date.now() - this.lastBottomTrigger > BOTTOM_COOLDOWN) {
        this.lastBottomTrigger = Date.now();
        this.say(pickRandom(LINES.bottom));
      }

      // 快速滚动检测
      const now = Date.now();
      const delta = Math.abs(window.scrollY - this.lastScrollY);
      this.scrollAccumulator += delta;
      this.lastScrollY = window.scrollY;

      if (this.scrollAccumulator > 800) {
        if (now - this.lastFastScrollTrigger > FAST_SCROLL_COOLDOWN) {
          this.lastFastScrollTrigger = now;
          this.say(pickRandom(LINES.fastScroll));
        }
        this.scrollAccumulator = 0;
      }

      // 回到顶部
      const nearTop = window.scrollY < 100;
      if (nearTop && !this.wasNearTop) {
        this.wasNearTop = true;
        if (Date.now() - this.lastTopTrigger > TOP_COOLDOWN) {
          this.lastTopTrigger = Date.now();
          this.say(pickRandom(LINES.top));
        }
      }
      if (!nearTop) {
        this.wasNearTop = false;
      }
    };
  }

  private createMusicChangeHandler(): EventListener {
    return (e: Event) => {
      if (!this.isDesktop) return;
      const { songName } = (e as CustomEvent).detail || {};
      if (songName && Date.now() - this.lastMusicTrigger > MUSIC_COOLDOWN) {
        this.lastMusicTrigger = Date.now();
        this.say(pickRandom(LINES.musicChange));
      }
    };
  }

  private createMusicPauseHandler(): EventListener {
    return () => {
      if (!this.isDesktop) return;
      if (Date.now() - this.lastMusicTrigger > MUSIC_COOLDOWN) {
        this.lastMusicTrigger = Date.now();
        this.say(pickRandom(LINES.musicPause));
      }
    };
  }

  private createRouteChangeHandler(): EventListener {
    return () => {
      if (!this.isDesktop) return;
      const now = Date.now();
      this.pageSwitchCount++;

      if (this.pageSwitchTimer) clearTimeout(this.pageSwitchTimer);
      this.pageSwitchTimer = setTimeout(() => {
        this.pageSwitchCount = 0;
      }, 10000);

      if (
        this.pageSwitchCount >= 4 &&
        now - this.lastPageSwitchTrigger > PAGE_SWITCH_COOLDOWN
      ) {
        this.lastPageSwitchTrigger = now;
        this.pageSwitchCount = 0;
        this.say(pickRandom(LINES.pageSwitchFrequent));
      }
    };
  }

  private createBeforeUnloadHandler(): EventListener {
    return () => {
      if (!this.isDesktop) return;
      if (Date.now() - this.lastBeforeLeaveTrigger > BEFORE_LEAVE_COOLDOWN) {
        this.lastBeforeLeaveTrigger = Date.now();
        try {
          this.storage?.setItem("ef_last_message", pickRandom(LINES.beforeLeave));
        } catch { /* ignore */ }
      }
    };
  }

  private createKeyDownHandler(): EventListener {
    return (e: Event) => {
      if (!this.isDesktop) return;
      const ev = e as KeyboardEvent;
      if (ev.key === "PrintScreen" || (ev.metaKey && ev.shiftKey && ev.key === "3")) {
        const now = Date.now();
        if (now - this.lastScreenshotTrigger > SCREENSHOT_COOLDOWN) {
          this.lastScreenshotTrigger = now;
          this.say(pickRandom(LINES.screenshot));
        }
      }
    };
  }

  /* ============================================================
   *  定时器
   * ============================================================ */

  private startTimers(): void {
    // 空闲检测 → Sleepy
    this.idleInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastActivity;
      if (
        elapsed > IDLE_THRESHOLD &&
        Date.now() - this.lastIdleTrigger > IDLE_COOLDOWN
      ) {
        this.lastIdleTrigger = Date.now();
        this.applyState("sleepy");
        this.say(pickRandom(LINES.idle));
      }
    }, 5000);

    // 页面停留较久台词
    this.stayInterval = setInterval(() => {
      if (!this.isDesktop) return;
      const elapsed = Date.now() - this.lastActivity;
      if (
        elapsed > 25000 &&
        Date.now() - this.lastStayTrigger > STAY_COOLDOWN
      ) {
        this.lastStayTrigger = Date.now();
        this.say(pickRandom(LINES.stayLong));
      }
    }, 10000);

    // 鼠标靠近 / 长时间停留检测
    this.mouseProximityInterval = setInterval(() => {
      if (!this.isDesktop || !this.mouseNearContainer) return;
      const now = Date.now();
      const hoverDuration = now - this.mouseHoverStartTime;

      if (
        hoverDuration > MOUSE_HOVER_LONG_COOLDOWN &&
        now - this.lastMouseHoverLongTrigger > MOUSE_HOVER_LONG_COOLDOWN * 2
      ) {
        this.lastMouseHoverLongTrigger = now;
        this.say(pickRandom(LINES.mouseHoverLong));
        return;
      }

      if (now - this.lastMouseNearbyTrigger > MOUSE_NEARBY_COOLDOWN) {
        if (Math.random() < 0.15) {
          this.lastMouseNearbyTrigger = now;
          this.say(pickRandom(LINES.mouseNearbyRare));
        }
      }
    }, 3000);

    // 深夜检测
    this.scheduleLateNightCheck();
  }

  private scheduleLateNightCheck(): void {
    if (this.destroyed) return;
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    const delay = nextMinute.getTime() - now.getTime();

    this.lateNightTimeout = setTimeout(() => {
      if (this.destroyed) return;
      const hour = new Date().getHours();
      if ((hour >= 0 && hour < 5) || hour >= 23) {
        if (Date.now() - this.lastLateNightTrigger > LATE_NIGHT_COOLDOWN) {
          this.lastLateNightTrigger = Date.now();

          if (this.storage) {
            const lateNightDays = JSON.parse(this.storage.getItem("ef_late_night_days") || "[]");
            const today = new Date().toDateString();
            if (!lateNightDays.includes(today)) {
              lateNightDays.push(today);
            }
            const recentDays = lateNightDays.slice(-7);
            this.storage.setItem("ef_late_night_days", JSON.stringify(recentDays));

            if (recentDays.length >= 3) {
              this.say(pickRandom(LINES.consecutiveLateNight));
              this.scheduleLateNightCheck();
              return;
            }
          }

          this.say(pickRandom(LINES.lateNight));
        }
      }
      this.scheduleLateNightCheck();
    }, delay);
  }

  /* ============================================================
   *  状态机
   * ============================================================ */

  private applyState(state: CharState): void {
    const cfg = STATE_CONFIG[state];
    this.prevState = this.currentState;
    this.currentState = state;

    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }

    this.modelCtrl?.stopAllMotions();

    // 进入 Sleepy 时重置鼠标
    if (state === "sleepy") {
      this.mouse.x = 0;
      this.mouse.y = 0;
      if (this.engine) {
        this.engine.mouse.x = 0;
        this.engine.mouse.y = 0;
      }
    }

    // 从 Sleepy 唤醒时重置姿态
    if (this.prevState === "sleepy" && state !== "sleepy") {
      this.modelCtrl?.resetPose();
      this.mouse.x = 0;
      this.mouse.y = 0;
      if (this.engine) {
        this.engine.mouse.x = 0;
        this.engine.mouse.y = 0;
      }
    }

    this.modelCtrl?.startMotion(cfg.motion, 0);

    if (cfg.expression) {
      this.modelCtrl?.setExpression(cfg.expression);
    } else {
      this.modelCtrl?.resetExpression();
    }

    if (cfg.duration) {
      this.stateTimer = setTimeout(() => {
        this.applyState("idle");
      }, cfg.duration);
    }
  }

  private handleClick(): void {
    const now = Date.now();
    const state = this.currentState;

    this.clickTimestamps = this.clickTimestamps.filter((t) => now - t < COMBO_WINDOW);
    this.clickTimestamps.push(now);

    if (this.clickTimestamps.length >= COMBO_THRESHOLD) {
      this.clickTimestamps = [];
      this.applyState("excited");
      return;
    }

    switch (state) {
      case "sleepy":
        this.applyState("curious");
        break;
      case "idle":
        this.applyState("curious");
        break;
      case "curious":
        if (this.stateTimer) {
          clearTimeout(this.stateTimer);
          this.stateTimer = null;
        }
        this.modelCtrl?.stopAllMotions();
        this.modelCtrl?.startMotion("haoqi", 0);
        this.stateTimer = setTimeout(() => this.applyState("idle"), 5000);
        break;
      case "excited":
        if (Math.random() < SHY_PROBABILITY) {
          this.applyState("shy");
        } else {
          if (this.stateTimer) {
            clearTimeout(this.stateTimer);
            this.stateTimer = null;
          }
          this.modelCtrl?.stopAllMotions();
          this.modelCtrl?.startMotion("haoqi", 0);
          this.stateTimer = setTimeout(() => this.applyState("idle"), 8000);
        }
        break;
      case "shy":
        if (this.stateTimer) {
          clearTimeout(this.stateTimer);
          this.stateTimer = null;
        }
        this.modelCtrl?.stopAllMotions();
        this.modelCtrl?.startMotion("yaotou", 0);
        this.stateTimer = setTimeout(() => this.applyState("idle"), 6000);
        break;
    }
  }

  /* ============================================================
   *  气泡（原生 DOM + CSS 动画）
   * ============================================================ */

  private say(text: string): void {
    if (!this.bubbleContainer) return;

    const id = this.nextMsgId++;
    const el = document.createElement("div");
    el.className = "live2d-bubble";
    el.textContent = text;
    el.style.cssText = `
      white-space: nowrap;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.15);
      padding: 7px 14px;
      font-size: 13px;
      line-height: 1.5;
      color: rgba(0,0,0,0.85);
      backdrop-filter: blur(12px);
      animation: live2d-bubble-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      box-shadow: 0 4px 24px rgba(236, 72, 153, 0.08), 0 1px 4px rgba(0,0,0,0.04);
    `;

    // 最多保留 3 条
    this.messages.push({ id, text, el });
    if (this.messages.length > 3) {
      const removed = this.messages.shift();
      if (removed) {
        removed.el.style.animation = "live2d-bubble-out 0.4s ease forwards";
        setTimeout(() => removed.el.remove(), 400);
      }
    }

    this.bubbleContainer.appendChild(el);

    // 自动消失
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      const idx = this.messages.findIndex((m) => m.id === id);
      if (idx >= 0) {
        const msg = this.messages[idx];
        this.messages.splice(idx, 1);
        msg.el.style.animation = "live2d-bubble-out 0.4s ease forwards";
        setTimeout(() => msg.el.remove(), 400);
      }
    }, DISPLAY_DURATION);
  }

  /* ============================================================
   *  首次访问 / 回访
   * ============================================================ */

  private showWelcomeMessage(): void {
    if (!this.isDesktop || !this.storage) return;

    const lastVisit = this.storage.getItem("ef_last_visit");
    const now = Date.now();
    this.storage.setItem("ef_last_visit", String(now));

    setTimeout(() => {
      if (this.destroyed) return;
      if (!lastVisit) {
        this.say(pickRandom(LINES.firstVisit));
      } else {
        const days = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
        if (days > 3) {
          this.say(pickRandom(LINES.longTimeNoSee));
        } else {
          this.say(pickRandom(LINES.welcomeBack));
        }
      }
    }, 3000);
  }

  /* ============================================================
   *  外部接口
   * ============================================================ */

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    this.updateLayout();
  }

  /* ============================================================
   *  Destroy
   * ============================================================ */

  destroy(): void {
    this.destroyed = true;

    // 清理定时器
    if (this.idleInterval) clearInterval(this.idleInterval);
    if (this.stayInterval) clearInterval(this.stayInterval);
    if (this.lateNightTimeout) clearTimeout(this.lateNightTimeout);
    if (this.mouseProximityInterval) clearInterval(this.mouseProximityInterval);
    if (this.stateTimer) clearTimeout(this.stateTimer);
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (this.pageSwitchTimer) clearTimeout(this.pageSwitchTimer);

    // 移除事件监听
    this.boundHandlers.forEach((handler, key) => {
      if (key === "pointerdown") {
        const engineContainer = this.root?.querySelector("#live2d-engine-container");
        engineContainer?.removeEventListener("pointerdown", handler);
      } else if (key === "musicChange") {
        window.removeEventListener(MUSIC_CHANGE_EVENT, handler);
      } else if (key === "musicPause") {
        window.removeEventListener(MUSIC_PAUSE_EVENT, handler);
      } else if (key === "routeChange") {
        window.removeEventListener(ROUTE_CHANGE_EVENT, handler);
      } else {
        window.removeEventListener(key, handler);
      }
    });
    this.boundHandlers.clear();

    // 销毁引擎
    this.engine?.destroy();
    this.engine = null;

    // 移除 DOM
    this.root?.remove();
    this.root = null;
    this.bubbleContainer = null;

    // 移除注入的样式
    document.getElementById("live2d-widget-styles")?.remove();
  }

  /* ============================================================
   *  工具
   * ============================================================ */

  private rafYield(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private idleYield(): Promise<void> {
    if (typeof requestIdleCallback !== "undefined") {
      return new Promise((resolve) => requestIdleCallback(() => resolve()));
    }
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
}