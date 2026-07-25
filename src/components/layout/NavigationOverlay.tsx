"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "@/i18n/navigation";

/**
 * 智能导航遮罩 —— 还原吉祥物 loading，但不牺牲性能。
 *
 * 与旧 GlobalLoadingOverlay 的区别：
 *  - 不拦截链接、不 preventDefault → 保留 Next <Link> 的 prefetch。
 *  - 被动监听点击：导航开始后延迟 120ms 才显示遮罩。
 *    预取命中的快页面在 120ms 内就切换完，根本不显示遮罩；
 *    只有真正慢的页面才弹出吉祥物。
 *  - pathname 变化（导航完成）立即隐藏；另有 8s 兜底防卡死。
 */

const SHOW_DELAY = 120;
const MAX_VISIBLE = 8000;

export function NavigationOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (maxTimer.current) { clearTimeout(maxTimer.current); maxTimer.current = null; }
  };

  useEffect(() => {
    // 预热 loading 图，避免首次慢页面时图还没到
    const warm = () => { const img = new window.Image(); img.src = "/loading.webp"; };
    if (typeof requestIdleCallback !== "undefined") requestIdleCallback(warm);
    else setTimeout(warm, 1000);

    function onClick(e: MouseEvent) {
      // 注意：用捕获阶段监听（见下方 addEventListener 第三参 true）。
      // Next <Link> 会在自己的 onClick 里 preventDefault 做客户端跳转，
      // 若用冒泡阶段，轮到这里时 e.defaultPrevented 已为 true，会漏掉所有 Link。
      // 捕获阶段在 React 之前执行，故此处不检查 defaultPrevented。
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const rawHref = a.getAttribute("href");
      if (!rawHref || a.target === "_blank" || a.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // 同页 / 锚点

      clearTimers();
      showTimer.current = setTimeout(() => {
        setVisible(true);
        maxTimer.current = setTimeout(() => setVisible(false), MAX_VISIBLE);
      }, SHOW_DELAY);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  // 路由切换完成 → 清计时器并隐藏
  useEffect(() => {
    clearTimers();
    const frame = requestAnimationFrame(() => setVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <>
      {visible && (
        <div className="anim-fade-in-slow fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <Image
            src="/loading.webp"
            alt=""
            width={192}
            height={192}
            className="anim-pop-in relative z-10 w-32 h-32 md:w-48 md:h-48 object-contain select-none"
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
