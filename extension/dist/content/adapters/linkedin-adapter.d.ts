/**
 * LinkedIn Adapter
 *
 * Handles job extraction from LinkedIn job pages
 *
 * Sample URLs:
 * - https://www.linkedin.com/jobs/view/1234567890/
 * - https://www.linkedin.com/jobs/details/1234567890
 *
 * LinkedIn DOM Structure:
 * - Job Title: .job-details-jobs-unified-top-card__job-title h1
 * - Company: .job-details-jobs-unified-top-card__company-name a
 * - Location: .job-details-jobs-unified-top-card__primary-description-container span
 * - Description: .jobs-description__content
 */
import { SiteAdapter, ExtractedJobData } from './types';
export declare class LinkedInAdapter implements SiteAdapter {
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
export declare const linkedInAdapter: LinkedInAdapter;
export default LinkedInAdapter;
//# sourceMappingURL=linkedin-adapter.d.ts.map