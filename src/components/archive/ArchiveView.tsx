"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser-client";
import { ArchiveTimeline } from "./ArchiveTimeline";
import { AdminArchiveTimeline } from "./AdminArchiveTimeline";
import type { PostMeta } from "@/types";

type YearGroup = {
  year: number;
  posts: PostMeta[];
};

type Props = {
  archive: YearGroup[];
  postsLabel: string;
};

/**
 * 归档视图切换 —— 登录态判断放在客户端。
 *
 * 这样 archive 页不再需要服务端 auth.getUser()（读 cookie 会强制动态化），
 * 页面得以保持 ISR / 静态缓存。预渲染的静态 HTML 只含已发布文章
 * （数据来自 listAllPosts → published=true），不会泄露草稿。
 * 管理操作（编辑/删除）走 server action 二次鉴权，按钮可见性不影响安全。
 */
export function ArchiveView({ archive, postsLabel }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  return isLoggedIn ? (
    <AdminArchiveTimeline archive={archive} postsLabel={postsLabel} />
  ) : (
    <ArchiveTimeline archive={archive} postsLabel={postsLabel} />
  );
}
