"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                {cancelText}
              </Button>
              <Button
                size="sm"
                onClick={onConfirm}
                disabled={loading}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {loading ? "处理中…" : confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}