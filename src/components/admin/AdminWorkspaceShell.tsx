import type { ReactNode } from "react";
import { EditorWorkspaceHeader } from "@/components/admin/EditorWorkspaceHeader";

type AdminWorkspaceShellProps = {
  children: ReactNode;
  email?: string | null;
  mode: "create" | "edit" | "drafts";
};

export function AdminWorkspaceShell({
  children,
  email,
  mode,
}: AdminWorkspaceShellProps) {
  return (
    <div className="anim-fade-up min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[22px] border border-surface-border bg-surface shadow-[0_24px_80px_-38px_rgba(25,74,91,0.34)] dark:bg-background/95 lg:h-[calc(100vh-1.5rem)] lg:min-h-0">
      <EditorWorkspaceHeader email={email} mode={mode} />
      {children}
    </div>
  );
}
