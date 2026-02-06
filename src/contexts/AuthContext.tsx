/**
 * Authentication Context and Provider
 * Manages user authentication state across the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, type UserProfile } from '@/lib/api-client';

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user profile on mount
    useEffect(() => {
        loadUser();
    }, []);

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

    const register = useCallback(async (email: string, password: string, name?: string) => {
        setIsLoading(true);
        try {
            await api.auth.register({ email, password, name });
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await api.auth.logout();
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!api.auth.isAuthenticated()) return;

        try {
            const profile = await api.user.getProfile();
            setUser(profile);
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        }
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
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
