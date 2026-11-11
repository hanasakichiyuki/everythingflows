"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPostImageProxyUrl } from "@/lib/post-image-url";

type ImageState = "loading" | "loaded" | "failed";

export function FragmentImage({
  src,
  alt,
  unavailableLabel,
  className,
  imageClassName,
  loading = "lazy",
}: {
  src?: string;
  alt: string;
  unavailableLabel: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <FragmentImageContent
      key={src ?? "missing"}
      src={src}
      alt={alt}
      unavailableLabel={unavailableLabel}
      className={className}
      imageClassName={imageClassName}
      loading={loading}
    />
  );
}

function FragmentImageContent({
  src,
  alt,
  unavailableLabel,
  className,
  imageClassName,
  loading,
}: {
  src?: string;
  alt: string;
  unavailableLabel: string;
  className?: string;
  imageClassName?: string;
  loading: "eager" | "lazy";
}) {
  const [state, setState] = useState<ImageState>(src ? "loading" : "failed");
  const imgRef = useRef<HTMLImageElement>(null);
  const imageSrc = src ? getPostImageProxyUrl(src) : null;

  // 缓存命中时，浏览器可能在 React 绑定 onLoad 之前就把 img 加载完了（complete=true）。
  // 那一刻 onLoad 已经错过，永远不会再触发，于是 state 卡在 "loading"，
  // 图片虽然已经下载成功，却一直停留在 opacity-0 —— 表现为「刷新后图全白了」。
  // 挂载后补一次同步检查即可覆盖这个分支。
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setState(img.naturalWidth > 0 ? "loaded" : "failed");
  }, [imageSrc]);

  return (
    <div className={cn("relative overflow-hidden bg-primary-soft/35", className)}>
      {state === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary-soft via-background/40 to-primary-soft" aria-hidden />
      )}
      {state === "failed" || !imageSrc ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted">
          <ImageOff className="h-5 w-5 text-primary/70" aria-hidden />
          <span className="text-xs leading-5">{unavailableLabel}</span>
        </div>
      ) : (
        // 用户上传图片尺寸不可预知，保留原生 img，并统一通过受限同源代理读取 R2。
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          className={cn(
            "h-full w-full transition-opacity duration-300 motion-reduce:transition-none",
            state === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
    </div>
  );
}
