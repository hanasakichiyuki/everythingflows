"use client";

import { Link } from "@/i18n/routing";
import { Pencil } from "lucide-react";

export function EditPostButton({ postId }: { postId: string }) {
  return (
    <Link
      href={`/admin/edit/${postId}`}
      className="shrink-0 rounded-lg border border-border p-2 transition-colors hover:bg-pink-100/50 hover:text-pink-500 dark:hover:bg-pink-900/20"
      title="编辑文章"
    >
      <Pencil className="h-4 w-4" />
    </Link>
  );
}
