"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/browser-client";
import { ContentCard } from "@/components/layout/ContentCard";

function ErrorToast({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(false), 2700);
    const doneTimer = setTimeout(onDone, 3000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`fixed inset-x-0 top-0 z-[9999] bg-yellow-100 py-3 text-center text-sm text-yellow-800 transition-all duration-300 ease-in-out dark:bg-yellow-900/50 dark:text-yellow-200 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      {message}
    </div>,
    document.body
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearError = () => setError("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const errorMap: Record<string, string> = {
        "Invalid login credentials": "邮箱或密码错误",
        "Email not confirmed": "邮箱未验证",
        "Too many requests": "请求过于频繁，请稍后再试",
      };
      setError(errorMap[error.message] ?? error.message);
    } else {
      router.push("/admin");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      {error && <ErrorToast message={error} onDone={clearError} />}
      <ContentCard>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight">登录</h1>
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-foreground/80">邮箱</label>
                <input
                  type="email"
                  className="mt-1.5 w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-foreground/30 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:border-white/10 dark:focus:ring-pink-900/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80">密码</label>
                <input
                  type="password"
                  className="mt-1.5 w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-foreground/30 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:border-white/10 dark:focus:ring-pink-900/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-pink-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? "登录中..." : "登录"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ContentCard>
    </>
  );
}
