"use client";

import { useRef, useEffect, useState } from "react";

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

interface Live2DCanvasProps {
  onLoad?: () => void;
  onError?: (err: Error) => void;
  onControllerReady?: (ctrl: ModelController) => void;
  mouseX?: number;
  mouseY?: number;
  isMobile?: boolean;
  disabled?: boolean;
}

/** 提供给父组件的模型控制接口 */
export interface ModelController {
  /** 切换表情 */
  setExpression: (id: string) => void;
  /** 触发动作，group 为 .motion3.json 文件名，index 从 0 开始 */
  startMotion: (group: string, index: number) => void;
  /** 重置表情到默认 */
  resetExpression: () => void;
  /** 终止当前所有动作 */
  stopAllMotions: () => void;
}

const W_DESKTOP = 280;
const H_DESKTOP = 420;
const W_MOBILE = 180;
const H_MOBILE = 280;
const MODEL_PATH = "/avatar/live2d/huohuo/huohuo.model3.json?v=2";
const CUBISM4_SDK =
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

export function Live2DCanvas({
  onLoad,
  onError,
  onControllerReady,
  mouseX = 0,
  mouseY = 0,
  isMobile = false,
  disabled = false,
}: Live2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<unknown>(null);
  const modelRef = useRef<unknown>(null);
  const breathTimeRef = useRef(0);
  const mountedRef = useRef(true);
  const [loaded, setLoaded] = useState(false);

  // 用 ref 追踪回调，避免主初始化 effect 依赖外部回调
  const onControllerReadyRef = useRef(onControllerReady);
  useEffect(() => {
    onControllerReadyRef.current = onControllerReady;
  }, [onControllerReady]);

  // 使用 ref 追踪鼠标值，避免 ticker 闭包捕获旧值
  const mouseXRef = useRef(mouseX);
  const mouseYRef = useRef(mouseY);

  useEffect(() => {
    mouseXRef.current = mouseX;
    mouseYRef.current = mouseY;
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (disabled) return;
    mountedRef.current = true;
    let cancelled = false;

    async function preload() {
      // 1. 预加载 Cubism SDK（必须等它就绪）
      const sdkReady = !window.Live2DCubismCore
        ? new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = CUBISM4_SDK;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Cubism SDK load failed"));
          document.head.appendChild(script);
        })
        : Promise.resolve();

      // 2. 页面就绪后立即开始
      if (document.readyState === "complete") {
        // 已就绪，直接继续
      } else {
        await new Promise<void>((resolve) => {
          window.addEventListener("load", () => resolve(), { once: true });
        });
      }
      if (cancelled) return;

      // 3. 等待 SDK 就绪
      await sdkReady;
      if (cancelled) return;

      // 4. 立即加载 PIXI + Live2D 模块（先于文字渲染完成）
      const [p, l] = await Promise.all([
        import("pixi.js"),
        import("pixi-live2d-display/cubism4"),
      ]);
      if (cancelled) return;

      return { pixiModule: p, live2dModule: l };
    }

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      const preloaded = await preload();
      if (!preloaded || cancelled) return;

      const PIXI = preloaded.pixiModule as typeof import("pixi.js");
      const live2d = preloaded.live2dModule as { Live2DModel: typeof import("pixi-live2d-display/cubism4").Live2DModel };
      const Live2DModel = live2d.Live2DModel;

      try {
        if (cancelled || !containerRef.current) return;

        // WebGL 上下文创建（唯一的同步阻塞点）
        const w = isMobile ? W_MOBILE : W_DESKTOP;
        const h = isMobile ? H_MOBILE : H_DESKTOP;
        const app = new PIXI.Application({
          width: w,
          height: h,
          transparent: true,
          antialias: true,
        });

        appRef.current = app;
        app.ticker.maxFPS = 30;
        containerRef.current.appendChild(app.view as HTMLCanvasElement);
        Live2DModel.registerTicker(PIXI.Ticker);

        // 加载模型资源（网络 I/O）
        const model = await Live2DModel.from(MODEL_PATH);

        if (cancelled) {
          model.destroy();
          app.destroy(true);
          return;
        }

        modelRef.current = model;

        const modelH = model.height;
        const targetH = app.screen.height * (isMobile ? 0.55 : 0.88);
        const s = modelH > 0 ? targetH / modelH : 0.22;
        model.scale.set(s);
        model.x = app.screen.width / 2;
        model.y = app.screen.height * 0.28;
        model.anchor.set(0.5, 0.3);

        app.stage.addChild(model);

        app.ticker.add(() => {
          if (!modelRef.current) return;
          breathTimeRef.current += 0.016;
          const m = (modelRef.current as { internalModel?: unknown }).internalModel;
          if (!m) return;
          const core = (m as { coreModel?: unknown }).coreModel as {
            getParameterValueById: (id: string) => number;
            setParameterValueById: (id: string, value: number) => void;
          };

          const breath =
            Math.sin(breathTimeRef.current * 1.2) * 0.4 +
            Math.sin(breathTimeRef.current * 0.7) * 0.2;

          core.setParameterValueById("ParamBreath", 0.5 + breath * 0.15);

          // 使用 model.focus() 让模型跟随鼠标
          // focus 需要 canvas 坐标系（0~w, 0~h），mouseX/mouseY 是 -1~1
          const focusX = ((mouseXRef.current + 1) / 2) * w;
          const focusY = ((mouseYRef.current + 1) / 2) * h;
          (modelRef.current as { focus: (x: number, y: number) => void }).focus(focusX, focusY);
        });

        if (mountedRef.current) {
          setLoaded(true);
          onLoad?.();

          // 暴露模型控制接口给父组件
          onControllerReadyRef.current?.({
            setExpression: (id: string) => {
              const em = (modelRef.current as { internalModel?: { motionManager?: { expressionManager?: { resetExpression?: () => void; setExpression?: (id: string) => void } } } }).internalModel?.motionManager?.expressionManager;
              em?.resetExpression?.(); // 先清掉上一个表情的参数，避免叠加
              (modelRef.current as { expression?: (id: string) => Promise<boolean> })?.expression?.(id);
            },
            startMotion: (group: string, index: number) => {
              (modelRef.current as { motion?: (g: string, i: number, p: number) => Promise<boolean> })?.motion?.(group, index, 3);
            },
            resetExpression: () => {
              const im = (modelRef.current as { internalModel?: { motionManager?: { expressionManager?: { resetExpression?: () => void; _motionManager?: { stopAllMotions?: () => void } } } } }).internalModel?.motionManager;
              const em = im?.expressionManager;
              em?.resetExpression?.();
              // 兜底：清空表达式动作队列
              em?._motionManager?.stopAllMotions?.();
            },
            stopAllMotions: () => {
              (modelRef.current as { internalModel?: { motionManager?: { stopAllMotions?: () => void } } }).internalModel?.motionManager?.stopAllMotions?.();
            },
          });
        }
      } catch (err) {
        console.error("Live2D 模型加载失败:", err);
        if (mountedRef.current) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      cancelled = true;

      // 清理 Pixi App（会自动销毁所有子元素包括 model）
      const app = appRef.current;
      if (app) {
        try {
          (app as { destroy: (removeView: boolean, options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void }).destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
          });
        } catch (err) {
          console.warn("pixi cleanup failed:", err);
        }
        appRef.current = null;
        modelRef.current = null;
      }
    };
  }, [disabled]);

  // isMobile 变化时：只 resize renderer + 重调模型缩放/位置，不重建
  useEffect(() => {
    const app = appRef.current;
    const model = modelRef.current;
    if (!app || !model) return;
    const w = isMobile ? W_MOBILE : W_DESKTOP;
    const h = isMobile ? H_MOBILE : H_DESKTOP;
    (app as { renderer: { resize: (w: number, h: number) => void } }).renderer.resize(w, h);
    const modelH = (model as { height: number }).height;
    const targetH = h * (isMobile ? 0.55 : 0.88);
    const s = modelH > 0 ? targetH / modelH : 0.22;
    (model as { scale: { set: (s: number) => void } }).scale.set(s);
    (model as { x: number }).x = w / 2;
    (model as { y: number }).y = h * 0.28;
  }, [isMobile]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: isMobile ? W_MOBILE : W_DESKTOP,
        height: isMobile ? H_MOBILE : H_DESKTOP,
        opacity: loaded ? (isMobile ? 0.35 : 1) : 0,
        transition: "opacity 1.5s ease-out",
      }}
    />
  );
}