export type ContentFormat = "html" | "mdx";

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
  content: string;
  contentFormat: ContentFormat;
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
  contentFormat: ContentFormat;
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
  locale: string;
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
