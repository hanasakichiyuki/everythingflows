"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2 } from "lucide-react";
import {
  CALLOUT_KINDS,
  type CalloutKind,
} from "@/lib/editor/callout";
import { cn } from "@/lib/utils";

const CALLOUT_LABELS: Record<CalloutKind, string> = {
  info: "信息",
  success: "成功",
  warning: "警告",
  danger: "危险",
};

export function CalloutNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const kind = CALLOUT_KINDS.includes(node.attrs.kind as CalloutKind)
    ? (node.attrs.kind as CalloutKind)
    : "info";

  return (
    <NodeViewWrapper
      as="aside"
      data-callout-type={kind}
      className={cn(
        "tiptap-callout group relative",
        `tiptap-callout-${kind}`,
        selected && "ring-2 ring-pink-300/50"
      )}
    >
      <div
        className="mb-1 flex items-center justify-between gap-2"
        contentEditable={false}
      >
        <select
          value={kind}
          onChange={(event) =>
            updateAttributes({ kind: event.target.value as CalloutKind })
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          aria-label="提示块类型"
        >
          {CALLOUT_KINDS.map((value) => (
            <option key={value} value={value}>
              {CALLOUT_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={deleteNode}
          className="rounded p-1 text-muted opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
          aria-label="删除提示块"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <NodeViewContent className="callout-content" />
    </NodeViewWrapper>
  );
}
