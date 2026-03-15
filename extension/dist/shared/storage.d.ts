/**
 * Chrome Storage API wrapper
 * Provides type-safe access to chrome.storage.local
 */
/**
 * Get value from storage
 */
export declare function get<T>(key: string): Promise<T | null>;
/**
 * Set value in storage
 */
export declare function set<T>(key: string, value: T): Promise<boolean>;
/**
 * Remove value from storage
 */
export declare function remove(key: string): Promise<boolean>;
/**
 * Clear all extension data from storage
 */
export declare function clear(): Promise<boolean>;
/**
 * Get all keys in storage
 */
export declare function keys(): Promise<string[]>;
/**
 * Get storage usage
 */
export declare function getUsage(): Promise<{
    used: number;
    available: number;
}>;
export declare const storage: {
    get: typeof get;
    set: typeof set;
    remove: typeof remove;
    clear: typeof clear;
    keys: typeof keys;
    getUsage: typeof getUsage;
};
//# sourceMappingURL=storage.d.ts.map