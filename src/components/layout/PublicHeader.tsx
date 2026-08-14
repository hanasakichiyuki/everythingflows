"use client";

import { Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { navItems, siteConfig } from "@/config/site";
import { ThemeToggle } from "./ThemeToggle";

export function PublicHeader({
  onOpenNavigation,
  onSearchClick,
  navigationOpen,
}: {
  onOpenNavigation: () => void;
  onSearchClick: () => void;
  navigationOpen: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const header = useTranslations("header");
  const activeItem = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  const pageTitle = activeItem?.external
    ? siteConfig.name
    : activeItem
      ? t(activeItem.label)
      : siteConfig.name;
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 mb-5 border-b border-border bg-background/90 px-0 py-3 backdrop-blur-xl md:-mx-8 md:mb-7 md:px-8 md:py-5 lg:-mx-10 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground/75 transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label={header("openNavigation")}
          aria-controls="mobile-navigation-drawer"
          aria-expanded={navigationOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 md:min-w-44 md:flex-none">
          <p className="truncate font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">{pageTitle}</p>
        </div>

        <button
          type="button"
          onClick={onSearchClick}
          className="group ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:mx-auto md:w-full md:max-w-md md:justify-start md:gap-3 md:px-4"
          aria-label={header("searchAria")}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-left text-sm md:block">{header("searchPlaceholder")}</span>
          <kbd className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted lg:inline">⌘ K</kbd>
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
