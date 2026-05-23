"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { siteConfig, navItems } from "@/config/site";
import { NavIcon } from "./NavIcon";
import { ThemeToggle } from "./ThemeToggle";
import { MusicPlayer } from "./MusicPlayer";
import { TransitionLink } from "./PageTransition";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser-client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Sidebar({
  onSearchClick,
  onCollapseClick,
  collapsed,
}: {
  onSearchClick: () => void;
  onCollapseClick: () => void;
  collapsed: boolean;
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
  const filteredNavItems = navItems.filter((item) => item.href !== "/search");

  return (
    <motion.aside
      className={`fixed left-0 top-0 z-20 flex h-screen w-[200px] shrink-0 flex-col border-r border-white/40 bg-white/60 px-4 py-6 transition-all duration-300 dark:border-white/10 dark:bg-gray-900/50 ${collapsed ? "-translate-x-full" : "translate-x-0"}`}
      initial={{ x: -200 }}
      animate={{ x: collapsed ? -200 : 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Top bar: ThemeToggle + Search + Collapse */}
      <motion.div
        className="mb-4 flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <ThemeToggle />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearchClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            aria-label="搜索"
          >
            <NavIcon name="search" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCollapseClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            aria-label="收起侧边栏"
          >
            <NavIcon name="panel-left-close" className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      <motion.header
        className="mb-5 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full ring-2 ring-border">
          <Image
            src={siteConfig.avatar}
            alt={siteConfig.name}
            fill
            className="object-cover"
            priority
            sizes="96px"
          />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground/90 dark:text-foreground">{siteConfig.name}</h1>
        <p className="mt-0.5 text-sm leading-snug text-muted">{siteConfig.description}</p>
      </motion.header>

      <motion.div
        className="mb-6 flex justify-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {siteConfig.social.map((link) => (
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
            ) : link.icon === "bilibili" ? (
              <NavIcon name="bilibili" className="h-6 w-6" />
            ) : link.icon === "qq" ? (
              <NavIcon name="qq" className="h-6 w-6" />
            ) : (
              <NavIcon name="cat" className="h-6 w-6" />
            )}
          </a>
        ))}
      </motion.div>

      <motion.nav
        className="flex flex-1 flex-col gap-0.5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.25 },
          },
        }}
      >
        {filteredNavItems.map((item) => (
          <motion.div
            key={item.href}
            variants={{
              hidden: { opacity: 0, x: -10 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
            }}
          >
            <TransitionLink
              href={item.href}
              className={cn("nav-item", isActive(item.href) && "nav-item-active")}
            >
              <span className="relative flex w-full items-center justify-center">
                <span className="absolute left-2">
                  <NavIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span>{t(item.label)}</span>
              </span>
            </TransitionLink>
          </motion.div>
        ))}
        <motion.div
          variants={{
            hidden: { opacity: 0, x: -10 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
          }}
        >
          {isLoggedIn ? (
            <TransitionLink
              href="/admin"
              className={cn("nav-item", isActive("/admin") && "nav-item-active")}
            >
              <span className="relative flex w-full items-center justify-center">
                <span className="absolute left-2">
                  <NavIcon name="edit" className="h-4 w-4" />
                </span>
                <span>{t("admin")}</span>
              </span>
            </TransitionLink>
          ) : (
            <TransitionLink
              href="/login"
              className={cn("nav-item", isActive("/login") && "nav-item-active")}
            >
              <span className="relative flex w-full items-center justify-center">
                <span className="absolute left-2">
                  <NavIcon name="lock" className="h-4 w-4" />
                </span>
                <span>{t("login")}</span>
              </span>
            </TransitionLink>
          )}
        </motion.div>
      </motion.nav>

      <motion.footer
        className="mt-auto flex items-center justify-center pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {siteConfig.music.enabled && <MusicPlayer collapsed={collapsed} />}
      </motion.footer>
    </motion.aside>
  );
}
