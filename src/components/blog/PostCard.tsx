"use client";

import { motion } from "framer-motion";
import { TransitionLink } from "@/components/layout/PageTransition";
import { formatDate } from "@/lib/utils";
import type { PostMeta } from "@/types";

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <motion.article
      className="group border-b border-border py-6 last:border-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ x: 4 }}
    >
      <TransitionLink href={`/blog/${encodeURIComponent(post.slug)}`} className="block">
        <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-pink-500">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{post.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <time dateTime={post.date}>{formatDate(post.date, "zh-CN")}</time>
          <span>{post.readingTime}</span>
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-black/5 px-2 py-0.5 dark:bg-white/10">
              #{tag}
            </span>
          ))}
        </div>
      </TransitionLink>
    </motion.article>
  );
}
