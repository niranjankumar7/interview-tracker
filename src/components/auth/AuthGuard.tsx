"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_PATH = "/auth";
const DEFAULT_AUTHED_REDIRECT = "/chat";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = useMemo(() => {
    if (!pathname) return false;
    return pathname === AUTH_PATH || pathname.startsWith(`${AUTH_PATH}/`);
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthRoute) {
      if (isAuthenticated) {
        router.replace(DEFAULT_AUTHED_REDIRECT);
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace(AUTH_PATH);
    }
  }, [isLoading, isAuthenticated, isAuthRoute, router]);

  const shouldBlockRender =
    isLoading || (isAuthRoute && isAuthenticated) || (!isAuthRoute && !isAuthenticated);

  if (shouldBlockRender) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/40 border-t-foreground" />
          <span className="text-sm font-medium">Authenticating...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
