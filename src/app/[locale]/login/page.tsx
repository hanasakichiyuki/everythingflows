"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser-client";
import { ContentCard } from "@/components/layout/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <ContentCard>
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
        <div className="w-full rounded-[20px] border border-surface-border bg-background/50 p-6 shadow-[0_20px_56px_-42px_rgba(25,74,91,0.42)] sm:p-8">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              管理入口
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">登录写作工作台</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              登录后可以继续编辑草稿、发布文章和管理内容。
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" noValidate aria-busy={loading}>
            <div>
              <Label htmlFor="login-email">邮箱</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                className="mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">密码</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                className="mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </div>
            {error && (
              <p
                id="login-error"
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} size="lg" className="mt-2 w-full">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "登录中…" : "登录"}
            </Button>
          </form>
        </div>
      </div>
    </ContentCard>
  );
}
