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
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathnameRef = useRef(pathname);

  const clearTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;

    pathnameRef.current = pathname;

    if (isTransitioning) {
      clearTimers();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      });
    }
  }, [pathname, isTransitioning, clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const navigate = useCallback(
    (href: string) => {
      if (isTransitioning || href === pathname) {
        return;
      }

      pendingHref.current = href;
      setIsTransitioning(true);

      transitionTimerRef.current = setTimeout(() => {
        const nextHref = pendingHref.current;
        pendingHref.current = null;
        if (nextHref) {
          router.push(nextHref);
        }
      }, 520);

      fallbackTimerRef.current = setTimeout(() => {
        pendingHref.current = null;
        setIsTransitioning(false);
      }, 3000);
    },
    [isTransitioning, pathname, router]
  );

  return (
    <TransitionContext.Provider value={{ isTransitioning, navigate }}>
      {children}
    </TransitionContext.Provider>
  );
}
