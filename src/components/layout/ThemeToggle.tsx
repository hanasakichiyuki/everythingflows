"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:text-pink-500"
      aria-label={isDark ? "亮色模式" : "暗色模式"}
    >
      {/* key 触发图标切换时的旋转淡入；suppressHydrationWarning 因 mounted 前后图标可能不同 */}
      <span key={isDark ? "sun" : "moon"} className="anim-icon-rotate inline-flex" suppressHydrationWarning>
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}
