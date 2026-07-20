export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="页面加载中">
      <div className="h-52 rounded-2xl bg-muted/40" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-2xl bg-muted/40" />
        <div className="h-48 rounded-2xl bg-muted/40" />
      </div>
    </div>
  );
}
