/**
 * Deduplication utilities for job applications
 * Prevents duplicate entries using normalized fingerprints with SHA-256 hashing
 */
export interface JobData {
    company: string;
    role: string;
    jobDescriptionUrl: string;
    externalJobId?: string;
    timestamp?: number;
}
export interface Fingerprint {
    normalizedCompany: string;
    normalizedRole: string;
    sourceUrl: string;
    timestamp: number;
}
/**
 * Normalize company name for comparison
 * - lowercase
 * - remove Inc, LLC, Ltd, punctuation
 */
export declare function normalizeCompany(name: string): string;
/**
 * Normalize role/job title for comparison
 * - lowercase
 * - expand common abbreviations
 */
export declare function normalizeRole(role: string): string;
/**
 * Generate a SHA-256 fingerprint for job data
 */
export declare function generateFingerprint(data: JobData): Promise<string>;
/**
 * Check if a new job is a duplicate of any existing job
 * - Compares normalized company, role, and URL
 * - Considers jobs within 24h window as potential duplicates
 */
export declare function isDuplicate(newJob: JobData, existingJobs: JobData[]): boolean;
/**
 * Legacy: Generate a simple fingerprint for backward compatibility
 * Uses the old hash approach for existing code
 */
export declare function generateSimpleFingerprint(data: {
    jobDescriptionUrl: string;
    company?: string;
    role?: string;
    externalJobId?: string;
}): string;
//# sourceMappingURL=dedupe.d.ts.map