"use client";

import { useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "./NavIcon";
import { cn } from "@/lib/utils";

const mobileItems = [
  { href: "/", icon: "home", label: "home" },
  { href: "/blog", icon: "book-open", label: "blog" },
  { href: "/archive", icon: "archive", label: "archive" },
  { href: "/chat", icon: "message-circle", label: "chat" },
] as const;

export function MobileNavigation({
  onMoreClick,
  drawerOpen,
}: {
  onMoreClick: () => void;
  drawerOpen: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateOffset = () => {
      document.documentElement.style.setProperty(
        "--mobile-nav-offset",
        mediaQuery.matches ? "4.5rem" : "0px"
      );
    };

    updateOffset();
    mediaQuery.addEventListener("change", updateOffset);
    return () => {
      mediaQuery.removeEventListener("change", updateOffset);
      document.documentElement.style.setProperty("--mobile-nav-offset", "0px");
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="移动端主导航"
      aria-hidden={drawerOpen}
      inert={drawerOpen}
      className={cn(
        "fixed inset-x-0 z-40 border-t border-surface-border bg-surface/95 px-2 pt-1.5 shadow-[0_-10px_30px_-24px_rgba(37,34,41,0.7)] backdrop-blur-xl md:hidden",
        drawerOpen && "pointer-events-none"
      )}
      style={{
        bottom: "calc(var(--mobile-player-offset, 0px) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 gap-1">
        {mobileItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive(item.href)
                ? "bg-primary-soft font-semibold text-primary"
                : "text-muted hover:bg-foreground/[0.045] hover:text-foreground"
            )}
          >
            <NavIcon name={item.icon} className="h-4 w-4" />
            <span className="truncate">{t(item.label)}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={onMoreClick}
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] text-muted transition-colors hover:bg-foreground/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("openMoreNavigation")}
          aria-controls="mobile-navigation-drawer"
          aria-expanded={drawerOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span>{t("more")}</span>
        </button>
      </div>
    </nav>
  );
}
