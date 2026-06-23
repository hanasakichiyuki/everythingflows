"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * 轻量路由过渡 —— 替代原自研 PageTransition。
 *
 * 与旧实现的区别：
 *  - 不拦截链接、不 preventDefault → 保留 Next <Link> 的 prefetch 与即时切换。
 *  - 不弹全屏遮罩、不锁 body 滚动 → 不再为动画牺牲 INP。
 *  - 仅入场淡入，用纯 CSS（key=pathname 触发重播），0.22s，且遵循 prefers-reduced-motion。
 *  - 仍在路由变化时派发 live2d:route-change，维持桌面端 Live2D 的页面切换感知。
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.dispatchEvent(new CustomEvent("live2d:route-change"));
  }, [pathname]);

  return (
    <div key={pathname} className="route-fade">
      {children}
    </div>
  );
}
