/**
 * SmartRecruiters ATS Adapter
 *
 * Handles job extraction from SmartRecruiters-powered career pages
 *
 * Sample URLs:
 * - https://jobs.smartrecruiters.com/CompanyName/1234567890-job-title
 * - https://jobs.smartrecruiters.com/CompanyName
 * - https://careers.smartrecruiters.com/CompanyName
 * - https://www.smartrecruiters.com/careers/company-name
 *
 * SmartRecruiters DOM Structure:
 * - Job Title: .job-title or h1
 * - Company: .company-name or from URL/meta
 * - Location: .job-location or .location
 * - Description: .job-description or .description
 */
import { SiteAdapter, ExtractedJobData } from './types';
export declare class SmartRecruitersAdapter implements SiteAdapter {
    domain: string;
    name: string;
    version: string;
    canHandle(url: string, _document: Document): boolean;
    extract(document: Document): ExtractedJobData;
    private extractCompany;
    private extractRole;
    private extractLocation;
    private extractDescription;
    private extractJobId;
    private calculateConfidence;
}
export declare const smartRecruitersAdapter: SmartRecruitersAdapter;
export default SmartRecruitersAdapter;
//# sourceMappingURL=smartrecruiters-adapter.d.ts.map