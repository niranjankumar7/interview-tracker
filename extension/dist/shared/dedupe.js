/**
 * Deduplication utilities for job applications
 * Prevents duplicate entries using normalized fingerprints with SHA-256 hashing
 */
/**
 * Normalize company name for comparison
 * - lowercase
 * - remove Inc, LLC, Ltd, punctuation
 */
export function normalizeCompany(name) {
    return name
        .toLowerCase()
        .replace(/\b(inc|llc|ltd|corp|corporation|limited|co|company)\b/gi, '')
        .replace(/[.,;:!?'"()[\]{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Normalize role/job title for comparison
 * - lowercase
 * - expand common abbreviations
 */
export function normalizeRole(role) {
    const abbreviations = {
        'sr': 'senior',
        'jr': 'junior',
        'mid': 'midlevel',
        'eng': 'engineer',
        'dev': 'developer',
        'mgr': 'manager',
        'dir': 'director',
        'vp': 'vice president',
        'cto': 'chief technology officer',
        'ceo': 'chief executive officer',
        'cfo': 'chief financial officer',
        'coo': 'chief operating officer',
        'pm': 'product manager',
        'ux': 'user experience',
        'ui': 'user interface',
        'fe': 'frontend',
        'be': 'backend',
        'fs': 'fullstack',
    };
    let normalized = role.toLowerCase();
    // Expand abbreviations (word boundaries to avoid partial matches)
    for (const [abbr, full] of Object.entries(abbreviations)) {
        normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
    }
    return normalized
        .replace(/[.,;:!?'"()[\]{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Normalize URL for comparison
 * Removes tracking parameters, trailing slashes, etc.
 */
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Remove common tracking parameters
        const trackingParams = [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'ref',
            'source',
            'gbraid',
            'wbraid',
            'fbclid',
            'gclid',
        ];
        trackingParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });
        // Remove trailing slash from pathname
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/') && pathname.length > 1) {
            pathname = pathname.slice(0, -1);
        }
        return `${urlObj.origin}${pathname}${urlObj.search}`;
    }
    catch {
        // If URL parsing fails, return as-is
        return url;
    }
}
/**
 * Generate SHA-256 hash using Web Crypto API
 * Works in both browser and Node.js environments
 */
async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Generate a SHA-256 fingerprint for job data
 */
export async function generateFingerprint(data) {
    const normalizedCompany = normalizeCompany(data.company);
    const normalizedRole = normalizeRole(data.role);
    const sourceUrl = normalizeUrl(data.jobDescriptionUrl);
    const timestamp = data.timestamp || Date.now();
    const fingerprintData = {
        normalizedCompany,
        normalizedRole,
        sourceUrl,
        timestamp,
    };
    const dataString = JSON.stringify(fingerprintData);
    return sha256(dataString);
}
/**
 * Generate a comparable key (without timestamp) for deduplication
 * Two jobs are duplicates if their comparable keys match
 */
function generateComparableKey(data) {
    const normalizedCompany = normalizeCompany(data.company);
    const normalizedRole = normalizeRole(data.role);
    const sourceUrl = normalizeUrl(data.jobDescriptionUrl);
    return `${normalizedCompany}|${normalizedRole}|${sourceUrl}`;
}
/**
 * Check if a new job is a duplicate of any existing job
 * - Compares normalized company, role, and URL
 * - Considers jobs within 24h window as potential duplicates
 */
export function isDuplicate(newJob, existingJobs) {
    const newJobKey = generateComparableKey(newJob);
    const newJobTimestamp = newJob.timestamp || Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    for (const existingJob of existingJobs) {
        const existingKey = generateComparableKey(existingJob);
        // Check if the normalized data matches
        if (existingKey === newJobKey) {
            const existingTimestamp = existingJob.timestamp || Date.now();
            const timeDiff = Math.abs(newJobTimestamp - existingTimestamp);
            // If within 24h window, it's a duplicate
            if (timeDiff <= windowMs) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Legacy: Generate a simple fingerprint for backward compatibility
 * Uses the old hash approach for existing code
 */
export function generateSimpleFingerprint(data) {
    // If we have an external job ID, use that as primary identifier
    if (data.externalJobId) {
        return `ext:${data.externalJobId}`;
    }
    const normalizedUrl = normalizeUrl(data.jobDescriptionUrl);
    const fingerprintData = `${normalizedUrl}|${data.company || ''}|${data.role || ''}`;
    // Simple hash for backward compatibility
    let hash = 0;
    for (let i = 0; i < fingerprintData.length; i++) {
        const char = fingerprintData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
//# sourceMappingURL=dedupe.js.map