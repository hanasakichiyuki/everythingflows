"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EditorView } from "@tiptap/pm/view";
import type { UploadedEditorImage } from "./upload";

/**
 * 图片上传第二阶段（原图补传 → 写回 `originalSrc`）的共用逻辑。
 *
 * 工具栏的"上传图片"与正文的粘贴/拖拽都必须走这里：两条入口各自实现一遍，很容易
 * 出现"其中一条忘了写 originalSrc"的漂移。
 */

/** 待写回的原图地址（按展示图 URL 索引）。 */
type PendingOriginal = { originalSrc: string; at: number };

/**
 * 超过这个时间仍没找到对应节点就放弃写回。
 *
 * 只有图片在被补传完成前就被作者删掉、或整篇文档被替换（切换文章）时才会触发；
 * 留一条清理规则是为了让这张表只增不减。
 */
const PENDING_TTL_MS = 60_000;

export function useEditorImageUpload(
  onNotice?: (message: string) => void
) {
  const pendingRef = useRef(new Map<string, PendingOriginal>());

  // 用 ref 持有回调：调用方通常传内联箭头函数，直接进依赖会让 hook 每次重渲都换身份。
  const noticeRef = useRef(onNotice);
  useEffect(() => {
    noticeRef.current = onNotice;
  }, [onNotice]);

  /**
   * 把已完成的原图写回对应的 image 节点。
   *
   * 为什么要等"下一次编辑器更新"而不是上传完立刻定位：展示图节点是上传流程**异步**
   * 插入文档的（`createImageUpload` 在 `onUpload` resolve 之后才 dispatch），而原图
   * 小而网络快时，可能先于那次插入完成。因此调用方在 `onUpdate` 里顺带调用本函数，
   * 插入事务一定会触发一次，届时按 `src` 精确匹配即可。
   */
  const flushOriginals = useCallback((view: EditorView | null) => {
    if (!view || view.isDestroyed) return;
    const pending = pendingRef.current;
    if (pending.size === 0) return;

    const { tr } = view.state;
    const targets: { pos: number; attrs: Record<string, unknown> }[] = [];

    view.state.doc.descendants((node, pos) => {
      if (node.type.name !== "image") return;
      const src = node.attrs.src;
      if (typeof src !== "string") return;

      const entry = pending.get(src);
      if (!entry) return;

      targets.push({ pos, attrs: { ...node.attrs, originalSrc: entry.originalSrc } });
      pending.delete(src);
    });

    // 只改属性、不改结构，节点大小不变，因此这里用原始坐标逐个替换是安全的。
    for (const target of targets) {
      tr.setNodeMarkup(target.pos, undefined, target.attrs);
    }
    if (targets.length > 0) view.dispatch(tr);

    const now = Date.now();
    for (const [src, entry] of pending) {
      if (now - entry.at > PENDING_TTL_MS) pending.delete(src);
    }
  }, []);

  const scheduleOriginal = useCallback(
    (view: EditorView | null, uploaded: UploadedEditorImage) => {
      if (uploaded.originalNotice) noticeRef.current?.(uploaded.originalNotice);
      if (!uploaded.uploadOriginal) return;

      void uploaded
        .uploadOriginal()
        .then((originalSrc) => {
          pendingRef.current.set(uploaded.displayUrl, {
            originalSrc,
            at: Date.now(),
          });
          flushOriginals(view);
        })
        .catch((error) => {
          // 原图只是"额外的一份"：补传失败不影响正文里的展示图，提示一下即可。
          console.error("[editor] 原图补传失败", error);
          noticeRef.current?.(
            "原图未保留：补传失败，正文里的展示图不受影响。"
          );
        });
    },
    [flushOriginals]
  );

  return { scheduleOriginal, flushOriginals };
}
