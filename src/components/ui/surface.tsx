import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  contentClassName?: string;
  overlay?: boolean;
  tone?: "default" | "solid" | "subtle";
  interactive?: boolean;
};

export function Surface({
  children,
  className,
  contentClassName,
  overlay = true,
  tone = "default",
  interactive = false,
  ...props
}: SurfaceProps) {
  const toneClassName = {
    default: "bg-surface shadow-[0_18px_48px_-34px_rgba(25,74,91,0.35)]",
    solid: "bg-background/95 shadow-[0_18px_48px_-34px_rgba(25,74,91,0.28)]",
    subtle: "bg-surface-overlay shadow-sm",
  }[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-surface border border-surface-border backdrop-blur-lg",
        toneClassName,
        interactive && "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl motion-reduce:transform-none",
        className
      )}
      {...props}
    >
      {overlay && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-surface-overlay"
          aria-hidden
        />
      )}
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}

type PageShellProps = {
  children: ReactNode;
  className?: string;
  surfaceClassName?: string;
  contentClassName?: string;
};

export function PageShell({
  children,
  className,
  surfaceClassName,
  contentClassName,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "anim-fade-up relative -mx-6 -my-8 px-6 py-8 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12",
        className
      )}
    >
      <Surface
        className={cn("px-8 py-10 sm:px-14", surfaceClassName)}
        contentClassName={contentClassName}
      >
        {children}
      </Surface>
    </div>
  );
}
