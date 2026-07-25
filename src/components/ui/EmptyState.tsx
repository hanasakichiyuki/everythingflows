import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-primary-soft/30 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
