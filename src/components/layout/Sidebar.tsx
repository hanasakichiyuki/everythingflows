"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { siteConfig, navItems } from "@/config/site";
import { NavIcon } from "./NavIcon";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser-client";
import { useEffect, useState } from "react";

export function Sidebar({
  onSearchClick,
  onCollapseClick,
  collapsed,
  isMobile,
}: {
  onSearchClick: () => void;
  onCollapseClick: () => void;
  collapsed: boolean;
  isMobile: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Filter out search from nav items (it's now in the top bar)
  const filteredNavItems = navItems.filter(
    (item) => item.href !== "/search" && (item.href !== "/links" || siteConfig.links.length > 0)
  );

  return (
    <aside
      id="mobile-navigation-drawer"
      aria-label="站点侧边栏"
      role={isMobile ? "dialog" : undefined}
      aria-modal={isMobile && !collapsed ? true : undefined}
      aria-hidden={collapsed}
      inert={collapsed}
      className={`fixed left-0 top-0 z-[60] flex h-[100dvh] w-[min(18rem,calc(100vw-3rem))] shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 shadow-[14px_0_40px_-38px_rgba(25,74,91,0.7)] transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none md:w-[220px] ${
        collapsed
          ? "pointer-events-none -translate-x-full"
          : isMobile
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="anim-fade-up mb-4 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onSearchClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10"
          aria-label="搜索"
        >
          <NavIcon name="search" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCollapseClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10"
          aria-label="收起侧边栏"
        >
          <NavIcon name="panel-left-close" className="h-4 w-4" />
        </button>
      </div>

      <header className="anim-fade-up mb-7 flex flex-col items-center text-center">
        <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full border-4 border-surface ring-1 ring-border shadow-sm">
          <Image
            src={siteConfig.avatar}
            alt={siteConfig.name}
            fill
            className="object-cover"
            priority
            sizes="80px"
          />
        </div>
        <p className="font-serif text-xl font-semibold tracking-tight text-foreground">{siteConfig.name}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted">传播我的虚弱</p>
      </header>

      <nav className="flex flex-1 flex-col gap-0.5"  aria-label="主导航">
        {filteredNavItems.map((item, index) => {
          const content = (
            <span className="flex w-full items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <NavIcon name={item.icon} className="h-4 w-4" />
              </span>
              <span>{t(item.label)}</span>
            </span>
          );

          return (
            <div
              key={item.href}
              className={`anim-fade-left anim-delay-${index + 1}`}
            >
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-item min-h-10"
                >
                  {content}
                </a>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "nav-item min-h-10",
                    isActive(item.href) && "nav-item-active"
                  )}
                >
                  {content}
                </Link>
              )}
            </div>
          );
        })}
        <div className={`anim-fade-left anim-delay-${filteredNavItems.length + 1}`}>
          {isLoggedIn ? (
            <Link
              href="/admin"
              aria-current={isActive("/admin") ? "page" : undefined}
              className={cn("nav-item min-h-10", isActive("/admin") && "nav-item-active")}
            >
              <span className="flex w-full items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <NavIcon name="edit" className="h-4 w-4" />
                </span>
                <span>{t("admin")}</span>
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              aria-current={isActive("/login") ? "page" : undefined}
              className={cn("nav-item min-h-10", isActive("/login") && "nav-item-active")}
            >
              <span className="flex w-full items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <NavIcon name="lock" className="h-4 w-4" />
                </span>
                <span>{t("login")}</span>
              </span>
            </Link>
          )}
        </div>
      </nav>

      <footer className="anim-fade-in mt-auto border-t border-border pt-5">
        <p className="px-2 text-center font-serif text-xs leading-relaxed text-muted">
          万物流转<br />
        </p>
        <div className="mt-4 flex justify-center gap-1">
          {siteConfig.social.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={link.label}
              aria-label={link.label}
            >
              <NavIcon name={link.icon} className="h-4 w-4" />
            </a>
          ))}
        </div>
      </footer>
    </aside>
  );
}
