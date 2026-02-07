"use client";

import { useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_PATH = "/auth";
const DEFAULT_AUTHED_REDIRECT = "/chat";
const RETURN_TO_PARAM = "returnTo";

/**
 * Public routes that don't require authentication.
 * Add any marketing pages, health checks, or public content here.
 */
const PUBLIC_ROUTES = [
  AUTH_PATH,           // Login/register page
  "/",                 // Landing page (if you add one)
  "/api",              // API routes are handled by their own auth
  "/_next",            // Next.js internal routes
  "/favicon.ico",      // Static assets
];

/**
 * Check if a pathname is a public route that doesn't require auth.
 */
function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAuthRoute = useMemo(() => {
    if (!pathname) return false;
    return pathname === AUTH_PATH || pathname.startsWith(`${AUTH_PATH}/`);
  }, [pathname]);

  const isPublic = useMemo(() => isPublicRoute(pathname), [pathname]);

  /**
   * Build the return-to URL for redirecting after login.
   * Preserves the originally requested path and query params.
   */
  const buildReturnUrl = useCallback(() => {
    if (!pathname || pathname === "/" || isAuthRoute) {
      return DEFAULT_AUTHED_REDIRECT;
    }
    // Include query params if present
    const queryString = searchParams?.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams, isAuthRoute]);

  /**
   * Get the return-to URL from query params (set when redirecting to login).
   */
  const getReturnTo = useCallback((): string => {
    const returnTo = searchParams?.get(RETURN_TO_PARAM);
    // Validate returnTo is a relative path (prevent open redirect)
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      return returnTo;
    }
    return DEFAULT_AUTHED_REDIRECT;
  }, [searchParams]);

  useEffect(() => {
    if (isLoading) return;

    // User is on auth route but already authenticated
    if (isAuthRoute && isAuthenticated) {
      // Redirect to the return-to URL or default
      const redirectTo = getReturnTo();
      router.replace(redirectTo);
      return;
    }

    // User is on a protected route but not authenticated
    if (!isPublic && !isAuthenticated) {
      // Preserve the originally requested URL for post-login redirect
      const returnTo = buildReturnUrl();
      const authUrl =
        returnTo !== DEFAULT_AUTHED_REDIRECT
          ? `${AUTH_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`
          : AUTH_PATH;
      router.replace(authUrl);
      return;
    }
  }, [isLoading, isAuthenticated, isAuthRoute, isPublic, router, buildReturnUrl, getReturnTo]);

  // Determine if we should block rendering while auth state settles
  const shouldBlockRender = useMemo(() => {
    // Always show loading during initial auth check
    if (isLoading) return true;

    // Block if on auth route but authenticated (about to redirect away)
    if (isAuthRoute && isAuthenticated) return true;

    // Block if on protected route but not authenticated (about to redirect to login)
    if (!isPublic && !isAuthenticated) return true;

    return false;
  }, [isLoading, isAuthenticated, isAuthRoute, isPublic]);

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
