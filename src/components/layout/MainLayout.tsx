import { Sidebar } from "./Sidebar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-10 md:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
