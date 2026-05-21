"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { siteConfig, navItems } from "@/config/site";
import { NavIcon } from "./NavIcon";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MusicPlayer } from "./MusicPlayer";
import { TransitionLink } from "./PageTransition";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-[200px] shrink-0 flex-col border-r border-white/40 bg-white/60 px-4 py-6  dark:border-white/10 dark:bg-gray-900/50">
      <header className="mb-5 flex flex-col items-center text-center">
        <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full ring-2 ring-border">
          <Image
            src={siteConfig.avatar}
            alt={siteConfig.name}
            fill
            className="object-cover"
            priority
            sizes="80px"
          />
        </div>
        <h1 className="text-base font-bold tracking-tight text-foreground">{siteConfig.name}</h1>
        <p className="mt-0.5 text-xs leading-snug text-foreground/70">{siteConfig.description}</p>
      </header>

      <div className="mb-6 flex justify-center gap-3">
        {siteConfig.links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 transition-colors hover:text-pink-500"
            title={link.label}
            aria-label={link.label}
          >
            {link.icon === "github" ? (
              <NavIcon name="github" className="h-6 w-6" />
            ) : (
              <NavIcon name="cat" className="h-6 w-6" />
            )}
          </a>
        ))}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <TransitionLink
            key={item.href}
            href={item.href}
            className={cn("nav-item", isActive(item.href) && "nav-item-active")}
          >
            <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
            <span>{t(item.label)}</span>
          </TransitionLink>
        ))}
        {siteConfig.features.admin && (
          <TransitionLink
            href="/admin"
            className={cn("nav-item", isActive("/admin") && "nav-item-active")}
          >
            <NavIcon name="user" className="h-4 w-4 shrink-0" />
            <span>{t("admin")}</span>
          </TransitionLink>
        )}
      </nav>

      <footer className="mt-auto space-y-1 border-t border-border pt-4">
        <LocaleSwitcher />
        <ThemeToggle />
        {siteConfig.music.enabled && <MusicPlayer />}
      </footer>
    </aside>
  );
}
