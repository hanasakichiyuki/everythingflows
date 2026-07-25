/**
 * Live2D 渲染引擎 — 纯原生 JS/TS，不依赖 React。
 *
 * 职责：
 *  - 创建 canvas，挂载到指定容器
 *  - 加载 PIXI + Live2D 模型
 *  - 30fps 渲染循环
 *  - 鼠标追踪（通过 ref 对象，不触发 React render）
 *  - resize 时只缩放 renderer，不重建 WebGL context
 *  - 正确 destroy
 */

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

/* ============================================================
 *  常量
 * ============================================================ */

const W_DESKTOP = 280;
const H_DESKTOP = 420;
const W_MOBILE = 180;
const H_MOBILE = 280;
const MODEL_PATH = "/avatar/live2d/huohuo/huohuo.model3.json?v=3";
const CUBISM4_SDK =
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

/* ============================================================
 *  类型
 * ============================================================ */

export interface ModelController {
  setExpression: (id: string) => void;
  startMotion: (group: string, index: number) => void;
  resetExpression: () => void;
  stopAllMotions: () => void;
  resetPose: () => void;
}

/** 可销毁对象 — 避免 any 断言 */
type Destroyable = { destroy: (...args: unknown[]) => unknown };

export interface EngineOptions {
  container: HTMLElement;
  isMobile: boolean;
  onControllerReady?: (ctrl: ModelController) => void;
  onError?: (err: Error) => void;
}

/** 鼠标状态 — 普通对象，不触发 React render */
export interface MouseState {
  x: number;
  y: number;
}

/* ============================================================
 *  引擎
 * ============================================================ */

export class Live2DEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private app: unknown = null;
  private model: unknown = null;
  private breathTime = 0;
  private destroyed = false;
  private isMobile: boolean;
  private onControllerReady?: (ctrl: ModelController) => void;
  private onError?: (err: Error) => void;

  /** 鼠标状态 — 普通对象引用 */
  mouse: MouseState = { x: 0, y: 0 };

  constructor(options: EngineOptions) {
    this.container = options.container;
    this.isMobile = options.isMobile;
    this.onControllerReady = options.onControllerReady;
    this.onError = options.onError;
  }

  /* ============================================================
   *  初始化入口
   * ============================================================ */

  async init(): Promise<void> {
    if (this.destroyed) return;

    try {
      // 阶段 1：加载 Cubism SDK
      await this.loadCubismSDK();
      if (this.destroyed) return;
      await this.rafYield();

      // 阶段 2：加载 PIXI + Live2D 模块
      const [p, l] = await Promise.all([
        import("pixi.js"),
        import("pixi-live2d-display/cubism4"),
      ]);
      if (this.destroyed) return;
      await this.rafYield();

      // 阶段 3：创建 PIXI Application + 加载模型
      await this.createApp(p, l);
      if (this.destroyed) return;
    } catch (err) {
      console.error("Live2D engine init failed:", err);
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /* ============================================================
   *  Cubism SDK 加载
   * ============================================================ */

  private async loadCubismSDK(): Promise<void> {
    if (window.Live2DCubismCore) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CUBISM4_SDK;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Cubism SDK load failed"));
      document.head.appendChild(script);
    });
  }

  /* ============================================================
   *  PIXI App 创建 + 模型加载
   * ============================================================ */

  private async createApp(
    pixiModule: typeof import("pixi.js"),
    live2dModule: { Live2DModel: typeof import("pixi-live2d-display/cubism4").Live2DModel }
  ): Promise<void> {
    const PIXI = pixiModule;
    const Live2DModel = live2dModule.Live2DModel;

    const w = this.isMobile ? W_MOBILE : W_DESKTOP;
    const h = this.isMobile ? H_MOBILE : H_DESKTOP;

      const app = new PIXI.Application({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
      });

    this.app = app;
    this.canvas = app.view as HTMLCanvasElement;
    app.ticker.maxFPS = 30;

    this.container.appendChild(this.canvas);
    Live2DModel.registerTicker(PIXI.Ticker);

    await this.rafYield();

    // 加载模型
    const model = await Live2DModel.from(MODEL_PATH);
    if (this.destroyed) {
      model.destroy();
      app.destroy(true);
      return;
    }

    this.model = model;

    const modelH = model.height;
    const targetH = app.screen.height * (this.isMobile ? 0.55 : 0.88);
    const s = modelH > 0 ? targetH / modelH : 0.22;
    model.scale.set(s);
    model.x = app.screen.width / 2;
    model.y = app.screen.height * 0.28;
    model.anchor.set(0.5, 0.3);

    app.stage.addChild(model);

    // 30fps 渲染循环
    app.ticker.add(() => this.tick(w, h));

    // 暴露 ModelController
    this.onControllerReady?.(this.createController());
  }

  /* ============================================================
   *  渲染循环
   * ============================================================ */

  private tick(w: number, h: number): void {
    if (!this.model) return;

    this.breathTime += 0.016;

    const m = (this.model as { internalModel?: unknown }).internalModel;
    if (!m) return;

    const core = (m as { coreModel?: unknown }).coreModel as {
      getParameterValueById: (id: string) => number;
      setParameterValueById: (id: string, value: number) => void;
    };

    // 呼吸
    const breath =
      Math.sin(this.breathTime * 1.2) * 0.4 +
      Math.sin(this.breathTime * 0.7) * 0.2;
    core.setParameterValueById("ParamBreath", 0.5 + breath * 0.15);

    // 鼠标追踪（使用 ref 对象，不触发 React）
    const focusX = ((this.mouse.x + 1) / 2) * w;
    const focusY = ((this.mouse.y + 1) / 2) * h;
    (this.model as { focus: (x: number, y: number) => void }).focus(focusX, focusY);
  }

  private createController(): ModelController {
    return {
      setExpression: (id: string) => {
        const em = (this.model as any)?.internalModel?.motionManager?.expressionManager;
        em?.resetExpression?.();
        (this.model as any)?.expression?.(id);
      },
      startMotion: (group: string, index: number) => {
        (this.model as any)?.motion?.(group, index, 3);
      },
      resetExpression: () => {
        const em = (this.model as any)?.internalModel?.motionManager?.expressionManager;
        em?.resetExpression?.();
        em?._motionManager?.stopAllMotions?.();
      },
      stopAllMotions: () => {
        (this.model as any)?.internalModel?.motionManager?.stopAllMotions?.();
      },
      resetPose: () => {
        const m = (this.model as any)?.internalModel;
        if (!m) return;
        const core = (m as any)?.coreModel as {
          getParameterIds?: () => string[];
          setParameterValueById: (id: string, value: number) => void;
        } | undefined;
        if (!core) return;

        const poseParams = [
          "ParamAngleX", "ParamAngleY", "ParamAngleZ",
          "ParamEyeLOpen", "ParamEyeROpen", "ParamEyeLSmile", "ParamEyeRSmile",
          "ParamEyeBallX", "ParamEyeBallY",
          "ParamMouthOpenY", "ParamMouthForm",
          "ParamBodyAngleX", "ParamBodyAngleY", "ParamBodyAngleZ",
          "ParamBreath", "ParamBrowLY", "ParamBrowRY",
          "ParamBrowLX", "ParamBrowRX", "ParamBrowLAngle", "ParamBrowRAngle",
          "ParamBrowLForm", "ParamBrowRForm",
        ];

        const ids = core.getParameterIds?.() ?? poseParams;
        for (const id of ids) {
          if (
            id.startsWith("ParamAngle") ||
            id.startsWith("ParamEye") ||
            id.startsWith("ParamMouth") ||
            id.startsWith("ParamBody") ||
            id.startsWith("ParamBrow") ||
            id === "ParamBreath"
          ) {
            core.setParameterValueById(id, 0);
          }
        }
      },
    };
  }

  /* ============================================================
   *  Resize（不重建 WebGL context）
   * ============================================================ */

  resize(isMobile: boolean): void {
    this.isMobile = isMobile;
    const app = this.app as any;
    const model = this.model as any;
    if (!app || !model) return;

    const w = isMobile ? W_MOBILE : W_DESKTOP;
    const h = isMobile ? H_MOBILE : H_DESKTOP;
    app.renderer.resize(w, h);

    const modelH = model.height;
    const targetH = h * (isMobile ? 0.55 : 0.88);
    const s = modelH > 0 ? targetH / modelH : 0.22;
    model.scale.set(s);
    model.x = w / 2;
    model.y = h * 0.28;
  }

  /* ============================================================
   *  Destroy
   * ============================================================ */

  destroy(): void {
    this.destroyed = true;

    if (this.model) {
      try {
        (this.model as Destroyable).destroy();
      } catch (err) {
        console.warn("model cleanup failed:", err);
      }
      this.model = null;
    }

    if (this.app) {
      try {
        (this.app as Destroyable).destroy(true);
      } catch (err) {
        console.warn("pixi cleanup failed:", err);
      }
      this.app = null;
    }

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
    }
  }

  /* ============================================================
   *  工具
   * ============================================================ */

  private rafYield(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
}
