"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";
import { SunMedium } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { useTranslations } from "next-intl";

export function HomeDate() {
  const time = useCurrentTime();
  const t = useTranslations("home.date");
  return (
    <Surface className="anim-fade-up p-5" overlay={false} tone="solid">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        <SunMedium className="h-4 w-4 text-accent" />
        <span>{t("welcome", { greeting: t(time.greetingKey) })}</span>
      </div>
      <div className="mt-5 font-serif text-4xl font-semibold tracking-tight text-foreground">
        {time.time}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{time.dateLabel}</p>
    </Surface>
  );
}
