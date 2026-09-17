import type { TiptapDocument } from "@/lib/editor/types";

/**
 * 正文格式。历史 `html` / `mdx` 内容已一次性迁移为结构化内容，现在只有一种格式。
 * 保留该字段是因为数据库仍有 `content_format` 列，便于日后扩展新的存储格式。
 */
export type ContentFormat = "tiptap";

export interface Post {
  id?: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  category?: string;
  published: boolean;
  readingTime: string;
  contentJson: TiptapDocument | null;
  locale: string;
}

export interface PostMeta {
  id?: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  category?: string;
  published: boolean;
  readingTime: string;
  locale: string;
}

export interface SiteLink {
  id: string;
  label: string;
  href: string;
  icon: string;
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  author: string;
  avatar: string;
  /** AI 聊天头像（/chat 页面 AI 消息左侧显示），放 public/ 下 */
  aiAvatar: string;
  locale: string;
  social: SiteLink[];
  links: SiteLink[];
  music: {
    enabled: boolean;
    server: "netease" | "tencent" | "kugou";
    type: "playlist" | "song";
    id: string;
  };
  comments: {
    provider: "giscus" | "supabase" | "disabled";
    giscus?: {
      repo: string;
      repoId: string;
      category: string;
      categoryId: string;
      mapping: string;
      lang: string;
      theme?: string;
    };
  };
  features: {
    tools: boolean;
    admin: boolean;
  };
  backgroundImage?: string;
}

export interface ToolModule {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  enabled: boolean;
}
