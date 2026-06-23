import siteConfigJson from "../../site.config.json";
import type { SiteConfig } from "@/types";

export const siteConfig = siteConfigJson as SiteConfig;

export const navItems = [
  { href: "/", icon: "home", label: "home" },
  { href: "/archive", icon: "archive", label: "archive" },
  { href: "/fragments", icon: "sparkles", label: "fragments" },
  { href: "/chat", icon: "message-circle", label: "chat" },
  { href: "/search", icon: "search", label: "search" },
  { href: "/links", icon: "link", label: "links" },
  { href: "/about", icon: "user", label: "about" },
] as const;

export const futureTools: { id: string; nameKey: string; href: string; enabled: boolean }[] = [
  { id: "fortune", nameKey: "tools.fortune", href: "/tools/fortune", enabled: false },
];
