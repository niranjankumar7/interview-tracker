/**
 * Lever ATS Adapter
 *
 * Handles job extraction from Lever-powered career pages
 * Lever provides structured HTML with data-qa attributes and embedded JSON
 *
 * Sample URLs:
 * - https://jobs.lever.co/company-name/abcdef12-3456-7890-abcd-ef1234567890
 * - https://jobs.lever.co/techstartup
 *
 * Lever DOM Structure:
 * - Job Title: h1[data-qa="posting-name"]
 * - Company: .company-name or from URL/meta
 * - Location: .posting-categories span with location info
 * - Description: .posting-description or [data-qa="job-description"]
 */
import { SiteAdapter, ExtractedJobData } from './types';
export declare class LeverAdapter implements SiteAdapter {
    domain: string;
    name: string;
    version: string;
    /**
     * Check if this is a Lever job page
     */
    canHandle(url: string, document: Document): boolean;
    /**
     * Try to get job data from Lever's embedded JSON
     */
    private getLeverJobData;
    /**
     * Extract job data from Lever page
     */
    extract(document: Document): ExtractedJobData;
    private extractCompany;
    private extractRole;
    private extractLocation;
    private extractDepartment;
    private extractJobDescription;
    private extractJobId;
}
/**
 * Singleton instance
 */
export declare const leverAdapter: LeverAdapter;
export default LeverAdapter;
//# sourceMappingURL=lever-adapter.d.ts.map