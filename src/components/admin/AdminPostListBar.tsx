"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { deletePostsAction } from "@/app/actions/posts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function AdminPostListBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = totalCount > 0 && selectedIds.length === totalCount;

  const handleToggleAll = () => {
    if (allSelected) onDeselectAll();
    else onSelectAll();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setError(null);
    setLoading(true);
    const result = await deletePostsAction(selectedIds);
    setLoading(false);
    setConfirmOpen(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            className="rounded"
          />
          全选
        </label>
        {selectedIds.length > 0 && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
          >
            删除选中 ({selectedIds.length})
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="批量删除"
        message={`确定要删除选中的 ${selectedIds.length} 篇文章吗？此操作不可撤销。`}
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleBatchDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />
    </>
  );
}