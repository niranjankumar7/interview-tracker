"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/auth"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated && !isPublicRoute) {
                // Redirect to auth page if not logged in
                router.push("/auth");
            } else if (isAuthenticated && isPublicRoute) {
                // Redirect to dashboard if already logged in and trying to access auth
                router.push("/dashboard");
            }
        }
    }, [isAuthenticated, isLoading, isPublicRoute, router]);

    // Show loading spinner while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // If not authenticated and not on a public route, don't render (redirect is happening)
    if (!isAuthenticated && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
