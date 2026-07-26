import { ArrowLeft, FilePlus2, Files, LogOut, PenLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type EditorWorkspaceHeaderProps = {
  email?: string | null;
  mode: "create" | "edit" | "drafts";
};

export function EditorWorkspaceHeader({
  email,
  mode,
}: EditorWorkspaceHeaderProps) {
  const pageTitle =
    mode === "edit" ? "编辑文章" : mode === "drafts" ? "草稿箱" : "新增文章";

  return (
    <header className="relative z-40 flex h-12 items-center justify-between gap-3 border-b border-border/60 bg-white/50 px-3 backdrop-blur-xl dark:bg-white/[0.025] sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="mr-1 hidden items-center gap-1.5 sm:flex"
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <Button
          asChild
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
        >
          <Link href="/" aria-label="返回首页">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/75">
          <PenLine className="h-3.5 w-3.5 text-primary" />
          写作工作台
        </span>
        <span className="text-border">·</span>
        <h1 className="truncate text-xs text-muted">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <span
          className="mr-1 hidden max-w-40 items-center gap-1.5 truncate text-[10px] text-muted md:flex"
          title={email ?? undefined}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          已登录
        </span>
        {mode !== "create" && (
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/admin" aria-label="新建文章" title="新建文章">
              <FilePlus2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
        {mode !== "drafts" && (
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/admin/drafts" aria-label="草稿箱" title="草稿箱">
              <Files className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="登出"
            title="登出"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </header>
  );
}
