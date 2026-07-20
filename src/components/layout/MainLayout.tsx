"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "@/i18n/navigation";
import { Sidebar } from "./Sidebar";
import { RouteTransition } from "./RouteTransition";
import { NavigationOverlay } from "./NavigationOverlay";
import { RightSidebarProvider } from "./RightSidebarContext";
import type { SearchItem } from "@/components/search/SearchModal";
import { siteConfig } from "@/config/site";

const MusicPlayer = dynamic(() => import("./MusicPlayer").then((mod) => ({ default: mod.MusicPlayer })), { ssr: false });
const SearchModal = dynamic(
  () => import("@/components/search/SearchModal").then((mod) => ({ default: mod.SearchModal })),
  { ssr: false }
);

const Live2DWidget = dynamic(
  () => import("@/components/live2d/Live2DWidget").then((m) => m.Live2DWidget),
  { ssr: false }
);

export function MainLayout({ children, searchItems }: { children: React.ReactNode; searchItems: SearchItem[] }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const isAdminWorkspace =
    pathname === "/admin" || pathname.startsWith("/admin/");

  // 移动端默认收起侧边栏（桌面端保持展开）；跨断点时同步。
  // SSR 默认 false（桌面正确），挂载后按视口校正——侧边栏本就从屏外滑入，移动端几乎无闪烁。
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      setIsMobile(mq.matches);
      setSidebarCollapsed(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // 移动端导航后自动收起抽屉
  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setSidebarCollapsed(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile, pathname]);

  return (
    <RightSidebarProvider>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>
      <div className="relative flex min-h-screen">
        {/* Full-screen background image */}
        {!isAdminWorkspace && siteConfig.backgroundImage && (
          <div
            className="site-background fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
            aria-hidden
          />
        )}

        {/* Sidebar */}
        {!isAdminWorkspace && (
          <Sidebar
            onSearchClick={() => setSearchOpen(true)}
            onCollapseClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            collapsed={sidebarCollapsed}
          />
        )}

        {/* 移动端抽屉遮罩 —— 打开时点击关闭 */}
        {!isAdminWorkspace && isMobile && !sidebarCollapsed && (
          <div
            className="anim-fade-in fixed inset-0 z-[15] bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden
          />
        )}

        {/* Expand sidebar button (visible when collapsed) */}
        {!isAdminWorkspace && sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="anim-pop-in fixed left-2 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-white/60 text-foreground/70 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:scale-105 hover:bg-white/80 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-gray-900/50 dark:hover:bg-gray-900/70"
            aria-label="展开侧边栏"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        )}

        {/* Main content */}
        <main
          id="main-content"
          tabIndex={-1}
          className={`relative z-10 flex-1 transition-all duration-300 ${isAdminWorkspace ? "ml-0 bg-[#f1f2f5] px-3 py-3 dark:bg-[#101114]" : `public-site-main px-6 py-8 md:px-10 lg:px-12 ${sidebarCollapsed ? "ml-0" : "ml-0 md:ml-[200px]"}`}`}
        >
          <RouteTransition>
            <div
              className={
                isAdminWorkspace
                  ? "mx-auto w-full max-w-[1500px]"
                  : "mx-auto max-w-4xl"
              }
            >
              {children}
            </div>
          </RouteTransition>
          {!isAdminWorkspace && (
            <footer className="mt-12 text-center text-[11px] text-foreground/40">
              © 2026 Everythingflows.All rights reserved.
            </footer>
          )}
        </main>

        {/* Live2D Widget */}
        {!isAdminWorkspace && <Live2DWidget sidebarCollapsed={sidebarCollapsed} />}

        {/* Desktop Music Player */}
        {siteConfig.music.enabled && (
          <MusicPlayer
            collapsed={sidebarCollapsed}
            hidden={isAdminWorkspace}
          />
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        items={searchItems}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* 智能导航遮罩 —— 仅在页面真正加载慢时显示吉祥物 */}
      <NavigationOverlay />
    </RightSidebarProvider>
  );
}
