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
  };
}