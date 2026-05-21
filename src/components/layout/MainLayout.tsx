"use client";

import { Sidebar } from "./Sidebar";
import { PageTransitionProvider, usePageTransition } from "./PageTransition";
import { siteConfig } from "@/config/site";

function TransitionContent({ children }: { children: React.ReactNode }) {
  const { isTransitioning } = usePageTransition();

  return (
    <div
      className={`transition-all ease-out ${
        isTransitioning ? "duration-700 translate-y-6 opacity-0" : "duration-700 translate-y-0 opacity-100"
      }`}
    >
      {children}
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageTransitionProvider>
      <div className="relative flex min-h-screen">
        {/* Full-screen background image */}
        {siteConfig.backgroundImage && (
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: `url('${siteConfig.backgroundImage}')`,
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="relative z-10 ml-[200px] flex-1 px-6 py-8 md:px-10 lg:px-12">
          <TransitionContent>
            <div className="mx-auto max-w-4xl">{children}</div>
          </TransitionContent>
        </main>
      </div>
    </PageTransitionProvider>
  );
}
