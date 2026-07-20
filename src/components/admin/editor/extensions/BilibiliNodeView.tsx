"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { buildBilibiliPlayerUrl } from "@/lib/editor/bilibili";
import { cn } from "@/lib/utils";

export function BilibiliNodeView({
  node,
  deleteNode,
  selected,
}: NodeViewProps) {
  const src = buildBilibiliPlayerUrl({
    bvid: node.attrs.bvid,
    aid: node.attrs.aid,
    cid: node.attrs.cid,
    page: node.attrs.page,
    autoplay: false,
  });

  return (
    <NodeViewWrapper
      className={cn(
        "group relative my-6 overflow-hidden rounded-xl border bg-black/5",
        selected ? "border-pink-400 ring-2 ring-pink-300/30" : "border-border"
      )}
      data-bilibili-embed=""
    >
      {src ? (
        <div className="aspect-video w-full">
          <iframe
            src={src}
            title="Bilibili video preview"
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      ) : (
        <div className="flex min-h-36 items-center justify-center text-sm text-red-500">
          无效的 Bilibili 视频
        </div>
      )}
      <button
        type="button"
        onClick={deleteNode}
        className="absolute right-2 top-2 rounded-lg bg-black/65 p-2 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
        aria-label="删除视频"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </NodeViewWrapper>
  );
}
