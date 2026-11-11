"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * 正文图片浮层：点击图片查看原图。
 *
 * 挂载方式与 `CodeBlockEnhancer` 一致 —— 正文是服务端组件，这里只放一个标记元素，
 * 由它找到正文容器并做**事件委托**。这样公开文章页只为这一个小组件付出客户端 JS，
 * 正文本身不进入客户端组件树（首屏 HTML 与 SEO 都不受影响）。
 *
 * 触发元素由渲染器产出：带 `data-lightbox-src` 的 `<button>`（仅当该图保留了原图）。
 * 用原生按钮而非 div，回车/空格触发与读屏播报都是免费的。
 */

type OpenedImage = { src: string; alt: string };

/** 从标记元素向前找正文容器（`.prose-blog`）。 */
function findProseBlogContainer(marker: Element | null): HTMLElement | null {
  let node = marker?.previousElementSibling ?? null;

  while (node) {
    if (node instanceof HTMLElement && node.classList.contains("prose-blog")) {
      return node;
    }
    node = node.previousElementSibling;
  }

  return null;
}

export function ImageLightbox() {
  const markerRef = useRef<HTMLSpanElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [opened, setOpened] = useState<OpenedImage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const lightboxImgRef = useRef<HTMLImageElement>(null);

  // 与 FragmentImage 同源的坑：图片命中缓存时，浏览器可能在 React 绑定 onLoad
  // 之前就加载完成，onLoad 不再触发，"原图加载中…" 会一直挂在画面上。
  useEffect(() => {
    if (!opened) return;
    const img = lightboxImgRef.current;
    if (!img || !img.complete) return;
    setStatus(img.naturalWidth > 0 ? "ready" : "error");
  }, [opened]);

  useEffect(() => {
    // 往前找 `.prose-blog`，而不是直接取 `previousElementSibling`：正文后面可能还挂着
    // 其它增强组件，兄弟顺序不该成为隐式契约。
    const container = findProseBlogContainer(markerRef.current);
    if (!container) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest<HTMLElement>("[data-lightbox-src]");
      if (!trigger || !container.contains(trigger)) return;

      const src = trigger.dataset.lightboxSrc;
      if (!src) return;

      event.preventDefault();
      triggerRef.current = trigger;
      setStatus("loading");
      setOpened({ src, alt: trigger.dataset.lightboxAlt ?? "" });
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!opened) return;

    // 打开时锁滚动并把焦点交给关闭按钮，关闭时归还给触发元素。
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpened(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [opened]);

  return (
    <>
      <span ref={markerRef} className="hidden" aria-hidden="true" />
      {opened && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="查看原图"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={(event) => {
            // 只有点到遮罩本身才关闭：点图片本体或浮层内其它元素都不关。
            if (event.target === event.currentTarget) setOpened(null);
          }}
        >
          {status !== "ready" && (
            <span className="absolute text-sm text-white/75">
              {status === "loading" ? "原图加载中…" : "原图暂时无法加载"}
            </span>
          )}
          {/* 原图尺寸不可预知，用原生 img 让它按容器等比缩放（object-contain）。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={lightboxImgRef}
            src={opened.src}
            alt={opened.alt}
            className="max-h-full max-w-full rounded-lg object-contain"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
          />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="关闭原图"
            onClick={() => setOpened(null)}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
