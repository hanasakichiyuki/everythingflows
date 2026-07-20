import { PageShell } from "@/components/ui/surface";

export function ContentCard({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
