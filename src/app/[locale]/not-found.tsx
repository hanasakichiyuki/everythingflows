import Link from "next/link";
import { ContentCard } from "@/components/layout/ContentCard";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ContentCard>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-6xl font-bold text-muted">404</p>
        <h1 className="text-2xl font-semibold">页面没有找到</h1>
        <p className="text-muted">它可能已被移动或删除。</p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </ContentCard>
  );
}
