import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** A decorative loading placeholder that respects reduced-motion preferences. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-muted/45 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}
