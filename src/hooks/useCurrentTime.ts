"use client";

import { useState, useEffect } from "react";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date(0));

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    day: currentTime.getDate(),
    month: currentTime.toLocaleDateString("en-US", { month: "short" }),
    year: currentTime.getFullYear(),
    weekday: currentTime.toLocaleDateString("en-US", { weekday: "long" }),
  };
}