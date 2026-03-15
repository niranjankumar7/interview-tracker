/**
 * Greenhouse ATS Adapter
 *
 * Handles job extraction from Greenhouse-powered career pages
 *
 * Sample URLs:
 * - https://boards.greenhouse.io/company-name/jobs/1234567
 * - https://company-name.greenhouse.io/jobs/1234567
 * - https://boards.greenhouse.io/github/jobs/1234
 *
 * Greenhouse DOM Structure:
 * - Job Title: .app-title or h1
 * - Company: .company-name or from meta tags
 * - Location: .location or [data-location]
 * - Description: .content or #content
 */
import { SiteAdapter, ExtractedJobData } from './types';
export declare class GreenhouseAdapter implements SiteAdapter {
    domain: string;
    name: string;
    version: string;
    canHandle(url: string, document: Document): boolean;
    extract(document: Document): ExtractedJobData;
    private extractCompany;
    private extractRole;
    private extractLocation;
    private extractDescription;
    private extractJobId;
    private calculateConfidence;
}
export declare const greenhouseAdapter: GreenhouseAdapter;
export default GreenhouseAdapter;
//# sourceMappingURL=greenhouse-adapter.d.ts.map