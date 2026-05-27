"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpeechMessage {
  id: number;
  text: string;
}

interface Live2DSpeechBubbleProps {
  /** 消息队列 */
  message?: string | null;
  /** 消息显示后回调 */
  onDismiss?: () => void;
}

const DISPLAY_DURATION = 4500;

export function Live2DSpeechBubble({ message, onDismiss }: Live2DSpeechBubbleProps) {
  const [messages, setMessages] = useState<SpeechMessage[]>([]);
  const nextIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const addMessage = useCallback((text: string) => {
    const id = nextIdRef.current++;
    setMessages((prev) => [...prev.slice(-2), { id, text }]);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      onDismiss?.();
    }, DISPLAY_DURATION);
  }, [onDismiss]);

  useEffect(() => {
    if (message) {
      addMessage(message);
    }
  }, [message, addMessage]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="whitespace-nowrap rounded-xl border border-white/20 bg-white/15 px-3.5 py-2 text-[13px] leading-relaxed text-foreground/85 backdrop-blur-md dark:bg-white/8"
            style={{
              boxShadow:
                "0 4px 24px rgba(236, 72, 153, 0.08), 0 1px 4px rgba(0,0,0,0.04)",
              mixBlendMode: "screen" as React.CSSProperties["mixBlendMode"],
            }}
          >
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}