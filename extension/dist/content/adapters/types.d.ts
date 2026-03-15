/**
 * Site Adapter Framework - Types
 * Defines the contract for job site adapters
 */
/**
 * Metadata for extracted job data
 */
export interface ExtractedJobData {
    /** Company name */
    company: string;
    /** Job role/title */
    role: string;
    /** Job location (city, remote, etc.) */
    location?: string;
    /** Full job description */
    jobDescription?: string;
    /** URL of the job posting */
    jobUrl: string;
    /** External job ID from the source site */
    externalJobId?: string;
    /** Confidence score 0-1 based on extraction quality */
    confidence: number;
    /** Additional metadata specific to the site */
    metadata: Record<string, unknown>;
}
/**
 * Interface that all site adapters must implement
 */
export interface SiteAdapter {
    /** Domain pattern this adapter handles (e.g., "*.greenhouse.io", "linkedin.com") */
    domain: string;
    /** Human-readable name of the adapter */
    name: string;
    /** Version of the adapter for tracking breaking changes */
    version: string;
    /**
     * Check if this adapter can handle the given URL/document
     * @param url - Current page URL
     * @param document - DOM document
     * @returns true if this adapter can extract data from this page
     */
    canHandle(url: string, document: Document): boolean;
    /**
     * Extract job data from the document
     * @param document - DOM document
     * @returns Extracted job data with confidence score
     */
    extract(document: Document): ExtractedJobData;
}
/**
 * Test case for adapter validation
 */
export interface AdapterTestCase {
    /** Name of the test case */
    name: string;
    /** HTML fixture content or fixture file path */
    fixture: string;
    /** Expected extraction results (partial match) */
    expected: Partial<ExtractedJobData>;
    /** URL to simulate for this test */
    url: string;
    /** Minimum confidence threshold */
    minConfidence?: number;
}
/**
 * Test result from adapter test harness
 */
export interface AdapterTestResult {
    /** Adapter name */
    adapterName: string;
    /** Adapter version */
    adapterVersion: string;
    /** Test case name */
    testName: string;
    /** Whether the test passed */
    passed: boolean;
    /** Extracted data */
    extracted?: ExtractedJobData;
    /** Error message if failed */
    error?: string;
    /** Timestamp of test run */
    timestamp: Date;
}
/**
 * Registry entry with priority for domain matching
 */
export interface RegistryEntry {
    /** The adapter instance */
    adapter: SiteAdapter;
    /** Registration timestamp for ordering */
    registeredAt: Date;
    /** Priority (higher = preferred) */
    priority: number;
}
//# sourceMappingURL=types.d.ts.map