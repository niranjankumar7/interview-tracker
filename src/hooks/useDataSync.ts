'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';

/**
 * Hook to automatically sync data with backend when user is authenticated
 * Call this in your root layout or main app component
 */
export function useDataSync() {
    const { isAuthenticated, isLoading } = useAuth();
    const syncWithBackend = useStore((state) => state.syncWithBackend);
    const hasHydrated = useStore((state) => state.hasHydrated);

    useEffect(() => {
        // Only sync if user is authenticated and store has hydrated
        if (isAuthenticated && !isLoading && hasHydrated) {
            syncWithBackend().catch((error) => {
                console.error('Failed to sync data with backend:', error);
            });
        }
    }, [isAuthenticated, isLoading, hasHydrated, syncWithBackend]);
}
