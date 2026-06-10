"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "./Sidebar";
import { PageTransitionProvider, TransitionContent, GlobalLoadingOverlay, usePageTransition } from "./PageTransition";
import { RightSidebarProvider } from "./RightSidebarContext";
import { SearchModal } from "@/components/search/SearchModal";
import type { SearchItem } from "@/components/search/SearchModal";
import { siteConfig } from "@/config/site";
import { motion, AnimatePresence } from "framer-motion";

const Live2DWidget = dynamic(
  () => import("@/components/live2d/Live2DWidget").then((m) => m.Live2DWidget),
  { ssr: false }
);

function LoadingOverlayWrapper() {
  const { isNavigating } = usePageTransition();
  return <GlobalLoadingOverlay isVisible={isNavigating} />;
}

export function MainLayout({ children, searchItems }: { children: React.ReactNode; searchItems: SearchItem[] }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <RightSidebarProvider>
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
        <Sidebar
          onSearchClick={() => setSearchOpen(true)}
          onCollapseClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          collapsed={sidebarCollapsed}
        />

        {/* Expand sidebar button (visible when collapsed) */}
        <AnimatePresence>
          {sidebarCollapsed && (
            <motion.button
              onClick={() => setSidebarCollapsed(false)}
              className="fixed left-2 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 text-foreground/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/80 hover:text-foreground dark:bg-gray-900/50 dark:hover:bg-gray-900/70"
              aria-label="展开侧边栏"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className={`relative z-10 flex-1 px-6 py-8 md:px-10 lg:px-12 transition-all duration-300 ${sidebarCollapsed ? "ml-0" : "ml-0 md:ml-[200px]"}`}>
          <TransitionContent>
            <div className="mx-auto max-w-4xl">{children}</div>
          </TransitionContent>
          <footer className="mt-12 text-center text-[11px] text-foreground/30 text-teal-500">
            © 2026 Everythingflows.All rights reserved.
          </footer>
        </main>

        {/* Live2D Widget — 外挂式独立模块 */}
        <Live2DWidget sidebarCollapsed={sidebarCollapsed} />
      </div>

      {/* Search Modal */}
      <SearchModal
        items={searchItems}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Global Page Transition Loading Overlay */}
      <LoadingOverlayWrapper />
    </PageTransitionProvider>
    </RightSidebarProvider>
  );
}
