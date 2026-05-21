"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { usePathname, Link, useRouter } from "@/i18n/routing";

interface TransitionContextType {
  isTransitioning: boolean;
  navigate: (href: string) => void;
}

const TransitionContext = createContext<TransitionContextType>({
  isTransitioning: false,
  navigate: () => {},
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const isTransitioningRef = useRef(false);

  // Track pathname changes to reset transition state
  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false;
        // New page loaded, start fade-in
        const timer = setTimeout(() => setIsTransitioning(false), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  const navigate = useCallback((href: string) => {
    pendingHref.current = href;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
  }, []);

  // 淡出完成后执行路由跳转
  useEffect(() => {
    if (!isTransitioning || !pendingHref.current) return;

    const timer = setTimeout(() => {
      const href = pendingHref.current;
      pendingHref.current = null;
      if (href) router.push(href);
    }, 700);

    return () => clearTimeout(timer);
  }, [isTransitioning, router]);

  return (
    <TransitionContext.Provider value={{ isTransitioning, navigate }}>
      {children}
    </TransitionContext.Provider>
  );
}
