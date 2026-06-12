import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style Button.
 *
 * Variants are mapped to the project's existing button styles so behaviour and
 * look stay consistent during migration. The `ink` variant is a placeholder for
 * the upcoming 水墨 (ink-wash) theme — tweak it here and it propagates site-wide.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium select-none [transition:transform_0.2s_cubic-bezier(0.34,1.56,0.64,1),background-color_0.25s_ease,border-color_0.25s_ease,color_0.25s_ease,box-shadow_0.25s_ease,opacity_0.25s_ease] will-change-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/50 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary call-to-action (login submit, error retry…)
        default:
          "bg-pink-500 text-white shadow-sm hover:bg-pink-600 hover:shadow-md hover:shadow-pink-500/20",
        // Bordered secondary action
        outline:
          "border border-border bg-transparent hover:bg-pink-100/50 hover:text-pink-500 dark:hover:bg-pink-900/20",
        // Solid neutral (uses theme accent)
        secondary:
          "bg-accent text-background shadow-sm hover:opacity-90 hover:shadow-md",
        // Destructive (delete)
        destructive:
          "border border-red-500/50 text-red-500 hover:bg-red-500/10",
        // Low-emphasis, no border
        ghost:
          "hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10",
        // Inline link-style button
        link: "text-accent underline-offset-4 hover:underline active:scale-100",
        // 水墨 ink-wash — 素雅描边 + 墨汁晕开 hover + 纯墨色单色。
        // 视觉细节在 globals.css 的 .btn-ink（含晕染伪元素）集中维护。
        ink: "btn-ink font-serif tracking-wide",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. an <a> or next-intl <Link>) instead of <button>. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
