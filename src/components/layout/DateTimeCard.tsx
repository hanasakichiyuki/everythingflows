"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";
import { Surface } from "@/components/ui/surface";

export function DateTimeCard() {
  const { day, month, year, weekday } = useCurrentTime();

  return (
    <Surface className="anim-fade-up p-6" contentClassName="text-right">
        <div className="text-5xl font-bold text-foreground/90 dark:text-foreground">
          {day}
        </div>
        <div className="mt-1 text-sm text-muted">
          {month} {year}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {weekday}
        </div>
    </Surface>
  );
}
