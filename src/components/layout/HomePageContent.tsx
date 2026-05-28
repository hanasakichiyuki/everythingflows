"use client";

import { motion } from "framer-motion";
import { LatestPosts } from "./LatestPosts";
import { Fragments } from "./Fragments";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";

interface HomePageContentProps {
  posts: PostMeta[];
  fragments: MemoryFragment[];
}

const text = `或许鸟儿
会借这拓展的空间,飞得愈发炽烈。
春天曾需要你。常有一颗星辰
静静等候,只为让你留意。`;

/* const chars = (() => {
  let delay = 0;
  return text.split("").map((char) => {
    const currentDelay = delay;

    if (char === "，") {
      delay += 0.22;
    } else if (char === "。") {
      delay += 0.45;
    } else if (char === "\n") {
      delay += 0.7;
    } else {
      delay += 0.06;
    }

    return {
      char,
      delay: currentDelay,
    };
  });
})(); */

export function HomePageContent({ posts, fragments }: HomePageContentProps) {
  const { day, month, year, weekday } = useCurrentTime();

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 px-8 py-10 shadow-lg dark:border-white/10 dark:bg-gray-900/50 sm:px-14">
        <div className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-gray-900/30 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="mb-3 text-5xl font-bold tracking-tight">
                Everything
                <br />
                <span className="text-cyan-500">flows.</span>
              </h1>
            </div>

            <p
              className="
    max-w-[320px]
    text-[15px]
    leading-[2.2]
    tracking-[0.04em]
    text-neutral-700/70
    dark:text-neutral-300/65
    font-light
    whitespace-pre-line
  "
              style={{
                fontFamily: '"LXGW WenKai Screen", serif',
                textShadow: "0 0 20px rgba(255,255,255,0.05)",
              }}
            >
              {text}
            </p>

            {/* 逐字延迟动画（已注释）
            <motion.p
              className="
    max-w-[320px]
    text-[15px]
    leading-[2.2]
    tracking-[0.04em]
    text-neutral-700/70
    dark:text-neutral-300/65
    font-light
    whitespace-pre-line
  "
              style={{
                fontFamily: '"LXGW WenKai Screen", serif',
                textShadow: "0 0 20px rgba(255,255,255,0.05)",
              }}
              initial="hidden"
              animate="show"
              variants={{
                show: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {chars.map(({ char, delay }, index) => (
                <motion.span
                  key={index}
                  variants={{
                    hidden: {
                      opacity: 0,
                      filter: "blur(8px)",
                    },
                    show: {
                      opacity: 1,
                      filter: "blur(0px)",
                    },
                  }}
                  transition={{
                    delay,
                    duration: 2.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: char === "\n" ? "block" : "inline-block",
                  }}
                >
                  {char === "\n" ? "" : char}
                </motion.span>
              ))}
            </motion.p>
            */}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-right"
          >
            <div className="text-7xl font-bold text-foreground/90 dark:text-foreground">
              {day}
            </div>
            <div className="mt-1 text-sm text-muted">
              {month} {year}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {weekday}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <LatestPosts posts={posts} />
        <Fragments fragments={fragments} />
      </div>
    </div>
  );
}
