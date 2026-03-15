/**
 * Chrome Storage API wrapper
 * Provides type-safe access to chrome.storage.local
 */
const STORAGE_PREFIX = 'interview_tracker_';
/**
 * Get value from storage
 */
export async function get(key) {
    try {
        const fullKey = STORAGE_PREFIX + key;
        const result = await chrome.storage.local.get(fullKey);
        return result[fullKey] || null;
    }
    catch (error) {
        console.error('[Interview Tracker] Storage get error:', error);
        return null;
    }
}
/**
 * Set value in storage
 */
export async function set(key, value) {
    try {
        const fullKey = STORAGE_PREFIX + key;
        await chrome.storage.local.set({ [fullKey]: value });
        return true;
    }
    catch (error) {
        console.error('[Interview Tracker] Storage set error:', error);
        return false;
    }
}
/**
 * Remove value from storage
 */
export async function remove(key) {
    try {
        const fullKey = STORAGE_PREFIX + key;
        await chrome.storage.local.remove(fullKey);
        return true;
    }
    catch (error) {
        console.error('[Interview Tracker] Storage remove error:', error);
        return false;
    }
}
/**
 * Clear all extension data from storage
 */
export async function clear() {
    try {
        const allKeys = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(allKeys).filter(key => key.startsWith(STORAGE_PREFIX));
        await chrome.storage.local.remove(keysToRemove);
        return true;
    }
    catch (error) {
        console.error('[Interview Tracker] Storage clear error:', error);
        return false;
    }
}
/**
 * Get all keys in storage
 */
export async function keys() {
    try {
        const allKeys = await chrome.storage.local.get(null);
        return Object.keys(allKeys)
            .filter(key => key.startsWith(STORAGE_PREFIX))
            .map(key => key.replace(STORAGE_PREFIX, ''));
    }
    catch (error) {
        console.error('[Interview Tracker] Storage keys error:', error);
        return [];
    }
}
/**
 * Get storage usage
 */
export async function getUsage() {
    try {
        const bytes = await chrome.storage.local.getBytesInUse(null);
        // chrome.storage.local typically has 5MB limit
        const MAX_STORAGE = 5 * 1024 * 1024;
        return {
            used: bytes,
            available: MAX_STORAGE - bytes
        };
    }
    catch (error) {
        console.error('[Interview Tracker] Storage usage error:', error);
        return { used: 0, available: 0 };
    }
}
// Export storage utilities as namespace
export const storage = {
    get,
    set,
    remove,
    clear,
    keys,
    getUsage
};
//# sourceMappingURL=storage.js.map