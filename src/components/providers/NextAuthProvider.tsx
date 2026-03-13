"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * Next-Auth Session Provider Wrapper
 * 
 * This component wraps the application with Next-Auth's SessionProvider
 * to enable session management throughout the app.
 */
interface NextAuthProviderProps {
    children: ReactNode;
}

export function NextAuthProvider({ children }: NextAuthProviderProps) {
    return (
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
            {children}
        </SessionProvider>
    );
}
