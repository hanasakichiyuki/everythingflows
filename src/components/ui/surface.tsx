import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  contentClassName?: string;
  overlay?: boolean;
};

export function Surface({
  children,
  className,
  contentClassName,
  overlay = true,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-surface border border-surface-border bg-surface shadow-lg",
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
