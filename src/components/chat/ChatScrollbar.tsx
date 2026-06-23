"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ChatScrollbarProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** 滚动条宽度（px），内容会预留对应空间 */
  width?: number;
}

/**
 * 自定义滚动条：浮在消息列表右侧的可拖拽滑块。
 * - 始终可见（柔和色），hover/拖拽时加深
 * - 拖拽滑块 = 滚动内容；滚轮/触控板滚动内容 = 滑块同步移动
 * - 点击轨道空白处 = 翻页
 * - 内容不够长时不显示
 */
export function ChatScrollbar({ scrollRef, width = 6 }: ChatScrollbarProps) {
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbH, setThumbH] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ratio = el.clientHeight / el.scrollHeight;
    const h = Math.max(28, Math.round(ratio * el.clientHeight));
    const top = Math.min(
      el.clientHeight - h,
      Math.round(
        (el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) *
          (el.clientHeight - h)
      )
    );
    setThumbH(h);
    setThumbTop(top);
    setContainerH(el.clientHeight);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
      mo.disconnect();
    };
  }, [scrollRef, sync]);

  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;

    setDragging(true);
    const startY = e.clientY;
    const startScrollTop = el.scrollTop;
    const scrollRange = el.scrollHeight - el.clientHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const scrollDelta = (delta / (containerH - thumbH || 1)) * scrollRange;
      el.scrollTop = Math.max(0, Math.min(scrollRange, startScrollTop + scrollDelta));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onTrackMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const el = scrollRef.current;
    if (!el) return;
    const trackRect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const targetTop =
      clickY < thumbTop ? thumbTop - el.clientHeight * 0.8 : thumbTop + el.clientHeight * 0.8;
    const scrollRange = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.max(
      0,
      Math.min(scrollRange, (targetTop / (el.clientHeight - thumbH || 1)) * scrollRange)
    );
  };

  const canScroll = thumbH > 0 && thumbH < containerH;
  const active = hovering || dragging;

  if (!canScroll) return null;

  return (
    <div
      className="absolute right-0 top-0 z-20 h-full select-none"
      style={{ width: width + 8 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseDown={onTrackMouseDown}
    >
      <div
        ref={thumbRef}
        onMouseDown={onThumbMouseDown}
        className="absolute left-1/2 -translate-x-1/2 cursor-pointer rounded-full"
        style={{
          height: thumbH,
          top: thumbTop,
          width: active ? width + 2 : width,
          backgroundColor: "color-mix(in srgb, var(--foreground) " + (active ? "45%" : "22%") + ", transparent)",
          transition: "width 150ms ease, background-color 150ms ease",
        }}
      />
    </div>
  );
}
