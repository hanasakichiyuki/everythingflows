"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { usePathname, Link, useRouter } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";

interface TransitionContextType {
  navigate: (href: string) => void;
  isNavigating: boolean;
  finishLoading: () => void;
}

const TransitionContext = createContext<TransitionContextType>({
  navigate: () => {},
  isNavigating: false,
  finishLoading: () => {},
});

export function usePageTransition() {
  return useContext(TransitionContext);
}

export function TransitionLink({
  href,
  children,
  className,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<typeof Link>) {
  const { navigate } = usePageTransition();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigatingRef = useRef(false);
  const isFirstRender = useRef(true);

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;
      navigatingRef.current = true;
      setIsNavigating(true);
      router.push(href);
    },
    [router, pathname]
  );

  const finishLoading = useCallback(() => {
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    navigatingRef.current = false;
    setIsNavigating(false);
    // 通知 Live2D 页面切换
    window.dispatchEvent(new CustomEvent("live2d:route-change"));
  }, [pathname]);

  return (
    <TransitionContext.Provider value={{ navigate, isNavigating, finishLoading }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function TransitionContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { finishLoading } = usePageTransition();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onAnimationComplete={() => finishLoading()}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function GlobalLoadingOverlay({ isVisible }: { isVisible: boolean }) {
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.img
            src="/loading.webp"
            alt=""
            className="relative z-10 w-32 h-32 md:w-48 md:h-48 object-contain select-none"
            draggable={false}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}