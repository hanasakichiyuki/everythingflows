"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Sidebar } from "./Sidebar";
import { RouteTransition } from "./RouteTransition";
import { NavigationOverlay } from "./NavigationOverlay";
import { PublicHeader } from "./PublicHeader";
import { MobileNavigation } from "./MobileNavigation";
import { MusicPlayerProvider } from "./MusicPlayerProvider";
import type { SearchItem } from "@/components/search/SearchModal";
import { siteConfig } from "@/config/site";

const MusicPlayer = dynamic(() => import("./MusicPlayer").then((mod) => ({ default: mod.MusicPlayer })), { ssr: false });
const SearchModal = dynamic(
  () => import("@/components/search/SearchModal").then((mod) => ({ default: mod.SearchModal })),
  { ssr: false }
);

export function MainLayout({ children, searchItems }: { children: React.ReactNode; searchItems: SearchItem[] }) {
  const t = useTranslations("layout");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const isAdminWorkspace =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isMobileNavigationOpen = isMobile && !sidebarCollapsed;
  const openNavigation = () => setSidebarCollapsed(false);
  const closeNavigation = () => setSidebarCollapsed(true);
  const toggleNavigation = () => setSidebarCollapsed((value) => !value);

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

  useEffect(() => {
    if (!isMobileNavigationOpen) return;
    const drawer = document.getElementById("mobile-navigation-drawer");
    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebarCollapsed(true);
        return;
      }

      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("inert"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      drawer?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousActiveElement?.focus();
    };
  }, [isMobileNavigationOpen]);

  const isHome = pathname === "/";

  return (
    <MusicPlayerProvider>
      <a
        href="#main-content"
        aria-hidden={isMobileNavigationOpen}
        inert={isMobileNavigationOpen}
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        {!isAdminWorkspace && (
          <Sidebar
            onSearchClick={() => setSearchOpen(true)}
            onCollapseClick={toggleNavigation}
            collapsed={sidebarCollapsed}
            isMobile={isMobile}
          />
        )}

        {/* 移动端抽屉遮罩 —— 打开时点击关闭 */}
        {!isAdminWorkspace && isMobileNavigationOpen && (
          <button
            type="button"
            className="anim-fade-in fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm md:hidden"
            onClick={closeNavigation}
            aria-label={t("closeNavigation")}
          />
        )}

        {/* Expand sidebar button (visible when collapsed) */}
        {!isAdminWorkspace && sidebarCollapsed && !isMobile && (
          <button
            type="button"
            onClick={openNavigation}
            className="anim-pop-in fixed left-3 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-surface-border bg-surface/90 text-foreground/70 shadow-sm backdrop-blur-xl transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("openNavigation")}
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
          aria-hidden={isMobileNavigationOpen}
          inert={isMobileNavigationOpen}
          className={`relative z-10 flex-1 transition-all duration-300 ${isAdminWorkspace ? "ml-0 bg-[#f1f2f5] px-3 py-3 dark:bg-[#101114]" : `public-site-main px-4 py-0 md:px-8 lg:px-10 ${sidebarCollapsed ? "ml-0" : "ml-0 md:ml-[220px]"}`}`}
        >
          {!isAdminWorkspace && (
            <PublicHeader
              onOpenNavigation={openNavigation}
              onSearchClick={() => setSearchOpen(true)}
              navigationOpen={isMobileNavigationOpen}
            />
          )}
          <RouteTransition>
            <div
              className={
                isAdminWorkspace
                  ? "mx-auto w-full max-w-[1500px]"
                  : `mx-auto w-full ${isHome ? "max-w-[1500px]" : "max-w-4xl"}`
              }
            >
              {children}
            </div>
          </RouteTransition>
          {!isAdminWorkspace && (
            <footer className="mt-12 text-center text-xs text-muted/70">
              {t("footer", { year: 2026, siteName: siteConfig.name })}
            </footer>
          )}
        </main>

        {siteConfig.music.enabled && !isHome && (
          <MusicPlayer
            collapsed={sidebarCollapsed}
            hidden={isAdminWorkspace}
          />
        )}

        {!isAdminWorkspace && (
          <MobileNavigation onMoreClick={openNavigation} drawerOpen={isMobileNavigationOpen} />
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
    </MusicPlayerProvider>
  );
}
