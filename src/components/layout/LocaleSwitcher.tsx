"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Languages } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    router.replace(pathname, { locale: locale === "zh" ? "en" : "zh" });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="nav-item w-full"
    >
      <Languages className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{locale === "zh" ? "English" : "中文"}</span>
    </button>
  );
}
