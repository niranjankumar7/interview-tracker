/**
 * Generic Adapter - Fallback for unknown sites
 * Uses heuristics: JSON-LD, meta tags, common selectors
 * Low confidence but works everywhere
 */
import { SiteAdapter, ExtractedJobData } from './types';
/**
 * Generic adapter that attempts to extract job data from any site
 * using standard structured data formats and common selectors
 */
export declare class GenericAdapter implements SiteAdapter {
    domain: string;
    name: string;
    version: string;
    /**
     * Generic adapter can handle any URL, but with lowest priority
     */
    canHandle(url: string, document: Document): boolean;
    /**
     * Extract job data using multiple fallback strategies
     */
    extract(document: Document): ExtractedJobData;
    /**
     * Check if page has JobPosting schema
     */
    private hasJobPostingSchema;
    /**
     * Check for common job page indicators
     */
    private hasJobPageIndicators;
    /**
     * Extract data from JSON-LD structured data
     */
    private extractFromJsonLd;
    /**
     * Extract data from OpenGraph meta tags
     */
    private extractFromOpenGraph;
    /**
     * Extract data using common CSS selectors
     */
    private extractFromSelectors;
    /**
     * Extract company from domain
     */
    private extractCompanyFromDomain;
    /**
     * Extract site name from meta tag
     */
    private extractFromMetaSiteName;
    /**
     * Extract job title from page
     */
    private extractTitleFromPage;
    /**
     * Clean up job title by removing common suffixes
     */
    private cleanJobTitle;
    /**
     * Extract job ID from URL
     */
    private extractJobIdFromUrl;
    /**
     * Calculate overall confidence score
     */
    private calculateConfidence;
}
/**
 * Singleton instance of the generic adapter
 */
export declare const genericAdapter: GenericAdapter;
//# sourceMappingURL=generic-adapter.d.ts.map