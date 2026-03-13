/**
 * Authentication Context and Provider
 * Manages user authentication state across the application
 * Supports both credentials-based auth and OAuth (Google)
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import { api, type UserProfile } from '@/lib/api-client';

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isLoggingOut: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status: sessionStatus } = useSession();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const logoutInProgressRef = useRef(false);

    // Load user profile on mount and when session changes
    useEffect(() => {
        // If Next-Auth session is still loading, wait
        if (sessionStatus === 'loading') {
            return;
        }

        // If there's a Next-Auth session (Google OAuth), use that user data
        if (session?.user) {
            // Map Next-Auth session user to UserProfile format
            const mappedUser: UserProfile = {
                id: session.user.id || '',
                email: session.user.email || '',
                name: session.user.name || null,
                targetRole: null,
                experienceLevel: null,
                createdAt: new Date().toISOString(),
                progress: {
                    userId: session.user.id || '',
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActiveDate: null,
                    totalTasksCompleted: 0,
                    updatedAt: new Date().toISOString(),
                },
                preferences: {
                    userId: session.user.id || '',
                    theme: 'system',
                    studyRemindersEnabled: false,
                    calendarAutoSyncEnabled: false,
                    leetcodeAutoSyncEnabled: false,
                    updatedAt: new Date().toISOString(),
                },
                leetcode: null,
            };
            setUser(mappedUser);
            setIsLoading(false);
            return;
        }

        // Otherwise, try to load from credentials-based auth
        loadUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, sessionStatus]);

    const loadUser = useCallback(async () => {
        try {
            if (api.auth.isAuthenticated()) {
                const profile = await api.user.getProfile();
                setUser(profile);
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            // Clear invalid token
            await api.auth.logout();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            await api.auth.login({ email, password });
            const profile = await api.user.getProfile();
            setUser(profile);
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Register a new user account.
     *
     * NOTE: Registration intentionally does NOT auto-login the user.
     * After successful registration, the user is shown a success message
     * and asked to log in manually. This design choice:
     *   1. Allows email verification flows in the future
     *   2. Provides explicit user awareness of the login step
     *   3. Avoids confusion if backend returns a session cookie
     *
     * If your backend sets a session cookie on register, it will be
     * ignored until the next page load or explicit login.
     */
    const register = useCallback(async (email: string, password: string, name?: string) => {
        setIsLoading(true);
        try {
            await api.auth.register({ email, password, name });
            // Intentionally not setting user - require explicit login
            // See docstring above for rationale
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Log out the current user.
     * Uses a ref to prevent concurrent logout requests.
     * Handles both credentials-based and OAuth logout.
     */
    const logout = useCallback(async () => {
        // Prevent concurrent logout requests
        if (logoutInProgressRef.current) {
            return;
        }
        logoutInProgressRef.current = true;
        setIsLoggingOut(true);

        try {
            // If there's a Next-Auth session (OAuth), sign out from Next-Auth
            if (session) {
                await nextAuthSignOut({ redirect: false });
            }
            
            // Also clear credentials-based auth
            await api.auth.logout();
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear user on error - we want to log out locally
            setUser(null);
        } finally {
            setIsLoading(false);
            setIsLoggingOut(false);
            logoutInProgressRef.current = false;
        }
    }, [session]);

    const refreshProfile = useCallback(async () => {
        // If using Next-Auth, we don't need to refresh (session is server-side)
        if (session?.user) {
            return;
        }

        if (!api.auth.isAuthenticated()) return;

        try {
            const profile = await api.user.getProfile();
            setUser(profile);
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        }
    }, [session]);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        isLoggingOut,
        login,
        register,
        logout,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
