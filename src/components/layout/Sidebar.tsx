"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { siteConfig, navItems } from "@/config/site";
import { NavIcon } from "./NavIcon";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MusicPlayer } from "./MusicPlayer";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-sidebar px-6 py-8">
      <header className="mb-6 flex flex-col items-center text-center">
        <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-full ring-2 ring-border">
          <Image
            src={siteConfig.avatar}
            alt={siteConfig.name}
            fill
            className="object-cover"
            priority
            sizes="112px"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{siteConfig.name}</h1>
        <p className="mt-1 text-sm text-muted">{siteConfig.description}</p>
      </header>

      <div className="mb-8 flex justify-center gap-4">
        {siteConfig.links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-foreground"
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
          <Link
            key={item.href}
            href={item.href}
            className={cn("nav-item", isActive(item.href) && "nav-item-active")}
          >
            <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
            <span>{t(item.label)}</span>
          </Link>
        ))}
        {siteConfig.features.tools && (
          <Link
            href="/tools"
            className={cn("nav-item", isActive("/tools") && "nav-item-active")}
          >
            <NavIcon name="link" className="h-4 w-4 shrink-0" />
            <span>{t("tools")}</span>
          </Link>
        )}
        {siteConfig.features.admin && (
          <Link
            href="/admin"
            className={cn("nav-item", isActive("/admin") && "nav-item-active")}
          >
            <NavIcon name="user" className="h-4 w-4 shrink-0" />
            <span>{t("admin")}</span>
          </Link>
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
