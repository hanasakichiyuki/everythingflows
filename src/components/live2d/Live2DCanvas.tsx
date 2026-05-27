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
  mouseX?: number;
  mouseY?: number;
  isMobile?: boolean;
  disabled?: boolean;
}

const W = 280;
const H = 420;
const MODEL_PATH = "/avatar/live2d/huohuo/huohuo.model3.json";
const CUBISM4_SDK =
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

export function Live2DCanvas({
  onLoad,
  onError,
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

      // 2. 等 SDK 就绪后再导入 PIXI + Live2D
      let pixiModule: unknown = null;
      let live2dModule: unknown = null;

      const loadModules = sdkReady.then(async () => {
        if (cancelled) return;
        const [p, l] = await Promise.all([
          import("pixi.js"),
          import("pixi-live2d-display/cubism4"),
        ]);
        pixiModule = p;
        live2dModule = l;
      });

      // 3. 等页面就绪后再休眠 5 秒
      await new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          setTimeout(resolve, 6000);
        } else {
          window.addEventListener(
            "load",
            () => setTimeout(resolve, 5000),
            { once: true }
          );
        }
      }); 
      if (cancelled) return;

      // 4. 确保全部加载完毕
      await loadModules;
      if (cancelled) return;

      return { pixiModule, live2dModule };
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
        const app = new PIXI.Application({
          width: W,
          height: H,
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
          // focus 需要 canvas 坐标系（0~W, 0~H），mouseX/mouseY 是 -1~1
          const focusX = ((mouseXRef.current + 1) / 2) * W;
          const focusY = ((mouseYRef.current + 1) / 2) * H;
          (modelRef.current as { focus: (x: number, y: number) => void }).focus(focusX, focusY);
        });

        if (mountedRef.current) {
          setLoaded(true);
          onLoad?.();
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

      // 1. 清理 Live2D model
      const model = modelRef.current;

      if (model) {
        try {
          const parent = (model as { parent?: { removeChild: (child: unknown) => void } }).parent;

          if (parent) {
            parent.removeChild(model);
          }

          const destroyFn = (model as { destroy?: (options?: unknown) => void }).destroy;

          if (typeof destroyFn === "function") {
            destroyFn.call(model, { children: true });
          }

          modelRef.current = null;
        } catch (err) {
          console.warn("model cleanup failed:", err);
        }
      }

      // 2. 清理 Pixi App
      const app = appRef.current;

      if (app) {
        try {
          const view = (app as { view?: HTMLCanvasElement }).view;

          const destroyFn = (app as {
            destroy?: (
              removeView: boolean,
              options?: {
                children?: boolean;
                texture?: boolean;
                baseTexture?: boolean;
              }
            ) => void;
          }).destroy;

          if (typeof destroyFn === "function") {
            destroyFn.call(app, true, {
              children: true,
              texture: true,
              baseTexture: true,
            });
          }

          if (view && view.parentNode) {
            view.parentNode.removeChild(view);
          }

          appRef.current = null;
        } catch (err) {
          console.warn("pixi cleanup failed:", err);
        }
      }
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: W,
        height: H,
        opacity: loaded ? (isMobile ? 0.35 : 1) : 0,
        transition: "opacity 1.5s ease-out",
      }}
    />
  );
}