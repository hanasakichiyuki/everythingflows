"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";

export function HomeDate() {
  const time = useCurrentTime();
  return (
    <div className="anim-fade-up text-right">
      <div className="text-7xl font-bold text-foreground/90 dark:text-foreground">{time.day}</div>
      <div className="mt-1 text-sm text-muted">{time.month} {time.year}</div>
      <div className="mt-0.5 text-xs text-muted">{time.weekday}</div>
    </div>
  );
}
