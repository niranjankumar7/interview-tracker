'use client';

import { useDataSync } from '@/hooks/useDataSync';

/**
 * Client component wrapper that handles data synchronization
 * This component should be placed in the layout to ensure data is synced on mount
 */
export function DataSyncProvider({ children }: { children: React.ReactNode }) {
    useDataSync();
    return <>{children}</>;
}
