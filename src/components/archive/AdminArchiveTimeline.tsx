"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { AdminPostListBar } from "@/components/admin/AdminPostListBar";
import { deletePostAction, deletePostsAction } from "@/app/actions/posts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import type { PostMeta } from "@/types";

type YearGroup = {
  year: number;
  posts: PostMeta[];
};

type Props = {
  archive: YearGroup[];
  postsLabel: string;
};

function formatMonthDay(date: string) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function AdminArchiveTimeline({ archive, postsLabel }: Props) {
  const router = useRouter();
  const [manageMode, setManageMode] = useState(false);
  const allPostIds = archive.flatMap((g) => g.posts.map((p) => p.id!));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleTargetId, setSingleTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enterManageMode = () => {
    setManageMode(true);
    setSelectedIds(new Set());
  };

  const exitManageMode = () => {
    setManageMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSingleDelete = (id: string) => {
    setSingleTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      if (singleTargetId) {
        await deletePostAction(singleTargetId);
      } else if (selectedIds.size > 0) {
        await deletePostsAction(Array.from(selectedIds));
      }
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setSingleTargetId(null);
    }
  };

  return (
    <div>
      {/* Top-right manage button */}
      <div className="mb-6 flex items-center justify-end">
        {manageMode ? (
          <Button variant="outline" size="sm" onClick={exitManageMode}>
            完成
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={enterManageMode}>
            管理
          </Button>
        )}
      </div>

      {/* Batch delete bar — only in manage mode */}
      {manageMode && (
        <div className="anim-fade-up overflow-hidden">
          <AdminPostListBar
            selectedIds={Array.from(selectedIds)}
            totalCount={allPostIds.length}
            onSelectAll={() => setSelectedIds(new Set(allPostIds))}
            onDeselectAll={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      <div className="space-y-10">
        {archive.map(({ year, posts }, index) => (
          <section
            key={year}
            className="anim-fade-up"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-foreground/90">{year}</h2>
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-pink-300/60 bg-white/50" />
              </div>
              <span className="text-sm text-muted/70">
                {posts.length} {postsLabel}
              </span>
            </div>

            <div className="relative pl-8">
              <div
                className="absolute left-[2.125rem] top-2 bottom-2 w-px border-l border-dashed border-pink-300/25"
                aria-hidden
              />

              <ul className="space-y-1">
                {posts.map((post) => {
                  const isSelected = selectedIds.has(post.id!);

                  if (!manageMode) {
                    // Normal mode — original archive style
                    return (
                      <li key={post.slug}>
                        <Link
                          href={`/blog/${encodeURIComponent(post.slug)}`}
                          className="group relative grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4 gap-y-0.5 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-pink-100/50 dark:hover:bg-pink-900/20"
                        >
                          <span
                            className="absolute -left-[1.625rem] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-pink-400/40 transition-all duration-200 group-hover:h-5 group-hover:w-0.5 group-hover:rounded-sm group-hover:bg-pink-400"
                            aria-hidden
                          />
                          <time
                            className="text-right text-sm tabular-nums text-muted/60 transition-colors group-hover:text-foreground/80"
                            dateTime={post.date}
                          >
                            {formatMonthDay(post.date)}
                          </time>
                          <span className="min-w-0 text-[15px] font-medium leading-snug text-foreground/75 transition-all duration-200 group-hover:text-pink-500 group-hover:pl-4 truncate">
                            {post.title}
                          </span>
                          {post.tags.length > 0 && (
                            <div className="hidden max-w-[200px] flex-wrap justify-end gap-x-1.5 gap-y-0.5 text-xs text-pink-400/60 sm:flex">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="shrink-0">#{tag}</span>
                              ))}
                              {post.tags.length > 3 && <span className="text-muted/50">...</span>}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  }

                  // Manage mode — with checkbox, edit, delete
                  return (
                    <li key={post.slug} className="group relative">
                      <div
                        className="grid grid-cols-[auto_3.5rem_1fr_auto] items-center gap-x-4 gap-y-0.5 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-pink-100/50 dark:hover:bg-pink-900/20"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(post.id!)}
                          className="rounded shrink-0 cursor-pointer"
                        />

                        <span
                          className="absolute -left-[1.625rem] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-pink-400/40 transition-all duration-200 group-hover:h-5 group-hover:w-0.5 group-hover:rounded-sm group-hover:bg-pink-400"
                          aria-hidden
                        />

                        <time
                          className="text-right text-sm tabular-nums text-muted/60 transition-colors group-hover:text-foreground/80"
                          dateTime={post.date}
                        >
                          {formatMonthDay(post.date)}
                        </time>

                        <span className="min-w-0 text-[15px] font-medium leading-snug text-foreground/75 transition-all duration-200 group-hover:text-pink-500 group-hover:pl-4 truncate">
                          {post.title}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {post.tags.length > 0 && (
                            <div className="hidden max-w-[200px] flex-wrap justify-end gap-x-1.5 gap-y-0.5 text-xs text-pink-400/60 sm:flex">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="shrink-0">#{tag}</span>
                              ))}
                              {post.tags.length > 3 && <span className="text-muted/50">...</span>}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => router.push(`/admin/edit/${post.id}`)}
                            className="h-auto rounded border px-2 py-0.5 text-xs"
                          >
                            编辑
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleSingleDelete(post.id!)}
                            className="h-auto rounded border-red-500/30 px-2 py-0.5 text-xs"
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除文章"
        message="确定要删除这篇文章吗？此操作不可撤销。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleteConfirmOpen(false); setSingleTargetId(null); }}
        loading={loading}
      />
    </div>
  );
}