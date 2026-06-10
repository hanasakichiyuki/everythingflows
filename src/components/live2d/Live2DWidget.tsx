"use client";

import { useEffect, useRef } from "react";

/**
 * Live2D Widget — React 桥接组件。
 *
 * React 只负责在挂载时创建 widget，卸载时销毁 widget。
 * 所有渲染、事件、状态机都在 widget 内部以原生 JS 处理。
 * 不触发 React re-render。
 */
export function Live2DWidget({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const widgetRef = useRef<{ init: () => Promise<void>; destroy: () => void; setSidebarCollapsed: (v: boolean) => void } | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    // 动态导入 widget 模块，拆分 chunk
    import("@/lib/live2d/widget").then((mod) => {
      if (cancelled) return;
      widgetRef.current = new mod.Live2DWidget({ sidebarCollapsed });
      widgetRef.current.init();
    }).catch((err) => {
      console.error("Failed to load Live2D widget:", err);
    });

    return () => {
      cancelled = true;
      widgetRef.current?.destroy();
      widgetRef.current = null;
      initRef.current = false;
    };
  }, []);

  // 更新 sidebar 状态，不触发 re-render
  useEffect(() => {
    widgetRef.current?.setSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  return null; // Widget 自己创建 DOM，React 不渲染任何内容
}