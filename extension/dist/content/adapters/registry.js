/**
 * Site Adapter Framework - Registry
 * Manages adapter registration and discovery
 */
/**
 * Manages site adapters with domain matching and wildcards
 */
export class AdapterRegistry {
    adapters = new Map();
    static instance;
    /**
     * Get the singleton registry instance
     */
    static getInstance() {
        if (!AdapterRegistry.instance) {
            AdapterRegistry.instance = new AdapterRegistry();
        }
        return AdapterRegistry.instance;
    }
    /**
     * Reset the registry (useful for testing)
     */
    static reset() {
        AdapterRegistry.instance = new AdapterRegistry();
    }
    /**
     * Register a new site adapter
     * @param adapter - The adapter to register
     * @param priority - Optional priority (higher = preferred), defaults to 0
     */
    registerAdapter(adapter, priority = 0) {
        const domain = adapter.domain.toLowerCase();
        if (!this.adapters.has(domain)) {
            this.adapters.set(domain, []);
        }
        const entries = this.adapters.get(domain);
        entries.push({
            adapter,
            registeredAt: new Date(),
            priority
        });
        // Sort by priority (descending), then by registration time (ascending)
        entries.sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            return a.registeredAt.getTime() - b.registeredAt.getTime();
        });
    }
    /**
     * Find an adapter that can handle the given URL and document
     * @param url - Current page URL
     * @param document - DOM document
     * @returns Matching adapter or null if none found
     */
    findAdapter(url, document) {
        const hostname = new URL(url).hostname.toLowerCase();
        // Get all matching adapters for this domain
        const candidates = [];
        for (const [domainPattern, entries] of this.adapters) {
            if (this.matchesDomain(hostname, domainPattern)) {
                candidates.push(...entries);
            }
        }
        // Sort by priority
        candidates.sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            return a.registeredAt.getTime() - b.registeredAt.getTime();
        });
        // Return first adapter that canHandle returns true for
        for (const entry of candidates) {
            try {
                if (entry.adapter.canHandle(url, document)) {
                    return entry.adapter;
                }
            }
            catch (error) {
                console.warn(`Adapter ${entry.adapter.name} threw in canHandle:`, error);
            }
        }
        return null;
    }
    /**
     * Get all registered adapters
     * @returns Array of all registered adapters (flattened)
     */
    getAllAdapters() {
        const allAdapters = [];
        for (const entries of this.adapters.values()) {
            allAdapters.push(...entries.map(e => e.adapter));
        }
        return allAdapters;
    }
    /**
     * Get adapters for a specific domain pattern
     * @param domainPattern - The domain pattern to match
     * @returns Array of adapters for that domain
     */
    getAdaptersForDomain(domainPattern) {
        const entries = this.adapters.get(domainPattern.toLowerCase()) || [];
        return entries.map(e => e.adapter);
    }
    /**
     * Unregister an adapter by name
     * @param adapterName - Name of the adapter to remove
     * @returns true if adapter was found and removed
     */
    unregisterAdapter(adapterName) {
        let removed = false;
        for (const [domain, entries] of this.adapters) {
            const newEntries = entries.filter(e => e.adapter.name !== adapterName);
            if (newEntries.length !== entries.length) {
                this.adapters.set(domain, newEntries);
                removed = true;
            }
        }
        return removed;
    }
    /**
     * Check if hostname matches domain pattern with wildcard support
     * @param hostname - Full hostname from URL
     * @param pattern - Domain pattern (e.g., "*.greenhouse.io", "linkedin.com")
     * @returns true if hostname matches pattern
     */
    matchesDomain(hostname, pattern) {
        // Exact match
        if (hostname === pattern) {
            return true;
        }
        // Wildcard pattern: *.example.com
        if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(1); // .greenhouse.io
            return hostname.endsWith(suffix);
        }
        // Subdomain match: pattern "greenhouse.io" should match "app.greenhouse.io"
        if (hostname.endsWith('.' + pattern)) {
            return true;
        }
        return false;
    }
}
/**
 * Convenience function to register an adapter
 * @param adapter - The adapter to register
 * @param priority - Optional priority
 */
export function registerAdapter(adapter, priority) {
    AdapterRegistry.getInstance().registerAdapter(adapter, priority);
}
/**
 * Convenience function to find an adapter
 * @param url - Current page URL
 * @param document - DOM document
 * @returns Matching adapter or null
 */
export function findAdapter(url, document) {
    return AdapterRegistry.getInstance().findAdapter(url, document);
}
/**
 * Convenience function to get all adapters
 * @returns Array of all registered adapters
 */
export function getAllAdapters() {
    return AdapterRegistry.getInstance().getAllAdapters();
}
//# sourceMappingURL=registry.js.map