"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="zh">
      <body style={{ margin: 0 }}>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            color: "var(--foreground, #1a1a2e)",
            background: "var(--background, #f5f5f4)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "40px",
              textAlign: "center",
              border: "1px solid var(--surface-border, #e5e5e5)",
              borderRadius: "var(--radius, 16px)",
              background: "var(--surface, #ffffff)",
            }}
          >
          <h1 style={{ fontSize: "24px", margin: "0 0 12px" }}>出错了</h1>
          <p style={{ color: "var(--muted, #6b7280)", margin: "0 0 24px" }}>
            应用程序遇到了一个错误，请重试。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 24px",
              backgroundColor: "var(--primary, #db2777)",
              color: "var(--primary-foreground, #ffffff)",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            重试
          </button>
          </div>
        </main>
      </body>
    </html>
  );
}
