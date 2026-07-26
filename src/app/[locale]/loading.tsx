import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="页面加载中">
      <Skeleton className="h-52 rounded-[20px]" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48 rounded-[20px]" />
        <Skeleton className="h-48 rounded-[20px]" />
      </div>
    </div>
  );
}
