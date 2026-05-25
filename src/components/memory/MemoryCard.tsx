"use client";

import { useState, useEffect} from "react";
import { motion } from "framer-motion";
import { MemoryFragment } from "@/types/memory";

export function MemoryCard({ fragment, onClick }: { fragment: MemoryFragment; onClick?: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (fragment.type === "image" && fragment.imageUrl) {
      const img = new window.Image();
      img.onload = () => {
        setLoaded(true);
      };
      img.src = fragment.imageUrl;
    }
  }, [fragment.imageUrl, fragment.type]);

  if (fragment.type === "text") {
    const text = fragment.text || "";
    const textLength = text.length;
    const needsWrap = textLength > 20;
    const wrapLength = Math.ceil(textLength / 3);
    
    const displayText = needsWrap && textLength > wrapLength
      ? text.slice(0, wrapLength) + "\n" + text.slice(wrapLength)
      : text;

    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.005 }}
        transition={{ duration: 0.4 }}
        onClick={onClick}
        className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/30 bg-zinc-900/30 shadow-lg backdrop-blur-sm transition-all duration-500 hover:border-zinc-700/40 hover:shadow-xl hover:shadow-zinc-900/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        <div className="relative z-10 p-8 md:p-10">
          <p className="whitespace-pre-wrap text-xs font-light leading-[2] tracking-wide font-serif text-zinc-200">
            {displayText}
          </p>
        </div>
        <span className="relative z-10 block px-8 pb-6 text-[10px] tracking-widest text-zinc-500 md:px-10 md:pb-8">
          {new Date(fragment.createdAt).toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "short",
          })}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-800/30 bg-zinc-900/30 shadow-lg backdrop-blur-sm transition-all duration-500 hover:border-zinc-700/40 hover:shadow-xl hover:shadow-zinc-900/20"
    >
      <div className="relative w-full overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-zinc-800/20" />
        )}
        <img
          src={fragment.imageUrl || ""}
          alt={fragment.text || "Memory fragment"}
          className={`w-full object-cover transition-opacity duration-1000 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
        {fragment.text && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-5 pt-10">
            <p className="text-xs font-light leading-relaxed tracking-wide text-zinc-200/90">{fragment.text}</p>
          </div>
        )}
      </div>
      <span className="absolute right-3 bottom-2 text-[10px] tracking-widest text-zinc-400/70">
        {new Date(fragment.createdAt).toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "short",
        })}
      </span>
    </motion.div>
  );
}
