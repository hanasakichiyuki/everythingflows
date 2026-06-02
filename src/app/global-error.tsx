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
    <html>
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "20px",
          fontFamily: "system-ui, sans-serif"
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>出错了</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>应用程序遇到了一个错误</p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              backgroundColor: "#ec4899",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
