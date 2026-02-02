/**
 * Scraper Cache Service
 * LocalStorage-based caching for scraped interview data with TTL
 */

import { ScrapedInterviewData } from './duckduckgo';

const CACHE_PREFIX = 'scrape_cache_';
const CACHE_TTL_DAYS = 7;

interface CacheEntry {
    data: ScrapedInterviewData;
    timestamp: number;
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Get cached data for a key
 */
export function getScraperCache(key: string): ScrapedInterviewData | null {
    if (!isBrowser()) return null;

    try {
        const cacheKey = CACHE_PREFIX + key;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return null;

        const entry: CacheEntry = JSON.parse(cached);
        const now = Date.now();
        const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

        // Check if cache is still valid
        if (now - entry.timestamp > ttlMs) {
            // Cache expired, remove it
            localStorage.removeItem(cacheKey);
            return null;
        }

        return entry.data;
    } catch (error) {
        console.warn('Error reading scraper cache:', error);
        return null;
    }
}

/**
 * Set cached data for a key
 */
export function setScraperCache(key: string, data: ScrapedInterviewData): void {
    if (!isBrowser()) return;

    try {
        const cacheKey = CACHE_PREFIX + key;
        const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
        console.warn('Error setting scraper cache:', error);
        // LocalStorage might be full, try to clear old entries
        clearOldCacheEntries();
    }
}

/**
 * Clear a specific cache entry
 */
export function clearScraperCache(key: string): void {
    if (!isBrowser()) return;
    localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all scraper cache entries
 */
export function clearAllScraperCache(): void {
    if (!isBrowser()) return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries(): void {
    if (!isBrowser()) return;

    const now = Date.now();
    const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            try {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const entry: CacheEntry = JSON.parse(cached);
                    if (now - entry.timestamp > ttlMs) {
                        keysToRemove.push(key);
                    }
                }
            } catch {
                keysToRemove.push(key);
            }
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; size: string } {
    if (!isBrowser()) return { entries: 0, size: '0 KB' };

    let entries = 0;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            entries++;
            const value = localStorage.getItem(key);
            if (value) {
                totalSize += value.length * 2; // UTF-16 = 2 bytes per char
            }
        }
    }

    const sizeKB = (totalSize / 1024).toFixed(1);
    return { entries, size: `${sizeKB} KB` };
}
