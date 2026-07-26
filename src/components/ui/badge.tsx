import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium leading-none",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary",
        neutral: "bg-foreground/[0.06] text-muted",
        accent: "bg-accent/10 text-accent",
        warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        destructive: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
