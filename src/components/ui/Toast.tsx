"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "error" | "success";
}

export function Toast({ message, isVisible, onClose, type = "error" }: ToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-6 py-3 shadow-2xl backdrop-blur-md ${
            type === "error"
              ? "bg-red-900/80 border border-red-700/50"
              : "bg-green-900/80 border border-green-700/50"
          }`}
        >
          <span className={`text-sm font-light ${
            type === "error" ? "text-red-100" : "text-green-100"
          }`}>
            {message}
          </span>
          <button
            onClick={onClose}
            className={`text-xs hover:opacity-70 ${
              type === "error" ? "text-red-300" : "text-green-300"
            }`}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
