"use client";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "error" | "success";
}

export function Toast({ message, isVisible, onClose, type = "error" }: ToastProps) {
  if (!isVisible) return null;
  return (
    <div
      className="fixed left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      style={{
        bottom:
          "calc(1.5rem + var(--mobile-player-offset, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        role="alert"
        aria-live={type === "error" ? "assertive" : "polite"}
        className={`anim-fade-up flex items-center gap-3 rounded-xl px-6 py-3 shadow-2xl backdrop-blur-md ${
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
          aria-label="关闭"
          className={`text-xs hover:opacity-70 ${
            type === "error" ? "text-red-300" : "text-green-300"
          }`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
