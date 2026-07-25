"use client";

import { useState, useEffect } from "react";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return {
    day: currentTime.getDate(),
    month: currentTime.toLocaleDateString("en-US", { month: "short" }),
    year: currentTime.getFullYear(),
    weekday: currentTime.toLocaleDateString("en-US", { weekday: "long" }),
    time: currentTime.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    dateLabel: currentTime.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }),
    greetingKey:
      currentTime.getHours() < 6
        ? "lateNight"
        : currentTime.getHours() < 12
          ? "morning"
          : currentTime.getHours() < 18
            ? "afternoon"
            : "evening",
  };
}
