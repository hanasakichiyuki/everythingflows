import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** A consistent, actionable failure state for async UI. */
export function ErrorState({
  title = "加载失败",
  description = "暂时无法获取内容，请稍后再试。",
  onRetry,
  retryLabel = "重试",
  action,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-destructive/25 bg-destructive/10 text-center",
        compact ? "px-4 py-4" : "flex min-h-52 flex-col items-center justify-center px-6 py-10",
        className
      )}
      role="alert"
    >
      <AlertCircle
        className={cn("mx-auto text-destructive", compact ? "h-5 w-5" : "h-6 w-6")}
        aria-hidden="true"
      />
      <h2 className={cn("font-semibold", compact ? "mt-2 text-sm" : "mt-4 text-lg")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mx-auto leading-6 text-muted", compact ? "mt-1 text-xs" : "mt-2 max-w-sm text-sm")}>
          {description}
        </p>
      )}
      {(onRetry || action) && (
        <div className={cn("flex items-center justify-center gap-2", compact ? "mt-3" : "mt-5")}>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
