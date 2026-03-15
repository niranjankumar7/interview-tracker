/**
 * Site Adapter Framework - Registry
 * Manages adapter registration and discovery
 */
import { SiteAdapter } from './types';
/**
 * Manages site adapters with domain matching and wildcards
 */
export declare class AdapterRegistry {
    private adapters;
    private static instance;
    /**
     * Get the singleton registry instance
     */
    static getInstance(): AdapterRegistry;
    /**
     * Reset the registry (useful for testing)
     */
    static reset(): void;
    /**
     * Register a new site adapter
     * @param adapter - The adapter to register
     * @param priority - Optional priority (higher = preferred), defaults to 0
     */
    registerAdapter(adapter: SiteAdapter, priority?: number): void;
    /**
     * Find an adapter that can handle the given URL and document
     * @param url - Current page URL
     * @param document - DOM document
     * @returns Matching adapter or null if none found
     */
    findAdapter(url: string, document: Document): SiteAdapter | null;
    /**
     * Get all registered adapters
     * @returns Array of all registered adapters (flattened)
     */
    getAllAdapters(): SiteAdapter[];
    /**
     * Get adapters for a specific domain pattern
     * @param domainPattern - The domain pattern to match
     * @returns Array of adapters for that domain
     */
    getAdaptersForDomain(domainPattern: string): SiteAdapter[];
    /**
     * Unregister an adapter by name
     * @param adapterName - Name of the adapter to remove
     * @returns true if adapter was found and removed
     */
    unregisterAdapter(adapterName: string): boolean;
    /**
     * Check if hostname matches domain pattern with wildcard support
     * @param hostname - Full hostname from URL
     * @param pattern - Domain pattern (e.g., "*.greenhouse.io", "linkedin.com")
     * @returns true if hostname matches pattern
     */
    private matchesDomain;
}
/**
 * Convenience function to register an adapter
 * @param adapter - The adapter to register
 * @param priority - Optional priority
 */
export declare function registerAdapter(adapter: SiteAdapter, priority?: number): void;
/**
 * Convenience function to find an adapter
 * @param url - Current page URL
 * @param document - DOM document
 * @returns Matching adapter or null
 */
export declare function findAdapter(url: string, document: Document): SiteAdapter | null;
/**
 * Convenience function to get all adapters
 * @returns Array of all registered adapters
 */
export declare function getAllAdapters(): SiteAdapter[];
//# sourceMappingURL=registry.d.ts.map