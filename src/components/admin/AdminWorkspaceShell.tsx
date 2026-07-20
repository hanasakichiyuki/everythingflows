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
    <div className="anim-fade-up min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[22px] border border-black/5 bg-background/95 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)] dark:border-white/10 lg:h-[calc(100vh-1.5rem)] lg:min-h-0">
      <EditorWorkspaceHeader email={email} mode={mode} />
      {children}
    </div>
  );
}
