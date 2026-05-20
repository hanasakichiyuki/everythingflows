"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Languages, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";

const locales = [
  { code: "zh" as const, label: "中文" },
  { code: "en" as const, label: "English" },
];

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="nav-item w-full"
      >
        <Languages className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{t(locale)}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-background py-1 shadow-lg">
          {locales.map((l) => (
            <button
              key={l.code}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => {
                router.replace(pathname, { locale: l.code });
                setOpen(false);
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
