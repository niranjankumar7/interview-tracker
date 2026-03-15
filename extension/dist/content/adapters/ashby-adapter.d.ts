/**
 * Ashby ATS Adapter
 *
 * Handles job extraction from Ashby-powered career pages
 * Ashby provides both JSON API and structured HTML
 *
 * Sample URLs:
 * - https://jobs.ashbyhq.com/company-name/12345678-1234-1234-1234-123456789abc
 * - https://jobs.ashbyhq.com/company-name
 * - https://jobs.ashbyhq.com/anthropic
 *
 * Ashby DOM Structure:
 * - Job Title: h1 or [data-testid="job-title"]
 * - Company: .company-name or from URL/meta
 * - Location: .location or [data-testid="job-location"]
 * - Description: .job-description or .description
 *
 * Ashby also exposes job data via window.__ASHBY__ or API calls
 */
import { SiteAdapter, ExtractedJobData } from './types';
export declare class AshbyAdapter implements SiteAdapter {
    domain: string;
    name: string;
    version: string;
    canHandle(url: string, _document: Document): boolean;
    /**
     * Try to get job data from Ashby's embedded data or API
     */
    private getAshbyJobData;
    extract(document: Document): ExtractedJobData;
    private extractCompany;
    private extractRole;
    private extractLocation;
    private extractDescription;
    private extractJobId;
    private calculateConfidence;
}
export declare const ashbyAdapter: AshbyAdapter;
export default AshbyAdapter;
//# sourceMappingURL=ashby-adapter.d.ts.map