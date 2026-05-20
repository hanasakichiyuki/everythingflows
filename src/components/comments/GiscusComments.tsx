"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { siteConfig } from "@/config/site";

export function GiscusComments() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const giscus = siteConfig.comments.giscus;

  useEffect(() => {
    if (siteConfig.comments.provider !== "giscus" || !giscus?.repoId || !ref.current) return;

    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", process.env.NEXT_PUBLIC_GISCUS_REPO ?? giscus.repo);
    script.setAttribute("data-repo-id", process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? giscus.repoId);
    script.setAttribute("data-category", giscus.category);
    script.setAttribute("data-category-id", process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? giscus.categoryId);
    script.setAttribute("data-mapping", giscus.mapping);
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", resolvedTheme === "dark" ? "dark" : "light");
    script.setAttribute("data-lang", giscus.lang);
    script.setAttribute("crossOrigin", "anonymous");
    script.async = true;
    ref.current.appendChild(script);
  }, [resolvedTheme, giscus]);

  if (siteConfig.comments.provider === "disabled") {
    return (
      <p className="text-sm text-muted">
        评论已关闭。可在 site.config.json 中启用 Giscus，或接入 Supabase 评论 API。
      </p>
    );
  }

  if (!giscus?.repoId) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
        评论（Giscus）：请在{" "}
        <a href="https://giscus.app/zh-CN" className="underline" target="_blank" rel="noreferrer">
          giscus.app
        </a>{" "}
        配置 GitHub 仓库后，将 repoId / categoryId 填入 site.config.json。
      </p>
    );
  }

  return <div ref={ref} className="mt-8" />;
}
