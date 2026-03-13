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

export class LinkedInAdapter implements SiteAdapter {
  domain = 'linkedin.com';
  name = 'LinkedIn Adapter';
  version = '1.0.0';

  canHandle(url: string, _document: Document): boolean {
    const urlObj = new URL(url);
    
    // Must be linkedin.com domain
    if (!urlObj.hostname.endsWith('linkedin.com')) {
      return false;
    }
    
    // Must be a job detail or job view page
    const jobUrlPatterns = [
      /\/jobs\/view\//,
      /\/jobs\/details\//,
      /\/job-poster\//,
    ];
    
    return jobUrlPatterns.some(pattern => pattern.test(urlObj.pathname));
  }

  extract(document: Document): ExtractedJobData {
    const url = document.location?.href || '';
    
    const company = this.extractCompany(document);
    const role = this.extractRole(document);
    const location = this.extractLocation(document);
    const jobDescription = this.extractDescription(document);
    const jobId = this.extractJobId(url);

    const confidence = this.calculateConfidence({ company, role, location, jobDescription });

    return {
      company: company || 'Unknown Company',
      role: role || 'Unknown Position',
      location: location || undefined,
      jobDescription: jobDescription || undefined,
      jobUrl: url,
      externalJobId: jobId,
      confidence,
      metadata: {
        source: 'linkedin.com',
        platform: 'LinkedIn',
        hasDescription: !!jobDescription,
        hasLocation: !!location,
      }
    };
  }

  private extractCompany(document: Document): string | null {
    const selectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name a',
      '.topcard__org-name-link',
      '.job-details-company-name',
      '[data-test-job-details-company-name]',
      '.jobs-company__name',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) return el.textContent.trim();
    }

    return null;
  }

  private extractRole(document: Document): string | null {
    const selectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.topcard__title',
      'h1[data-test-job-details-title]',
      '.job-title',
      'h1',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) return el.textContent.trim();
    }

    return null;
  }

  private extractLocation(document: Document): string | null {
    const selectors = [
      '.job-details-jobs-unified-top-card__primary-description-container span',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor-row span',
      '.job-location',
      '.jobs-unified-top-card__primary-description',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) return el.textContent.trim();
    }

    return null;
  }

  private extractDescription(document: Document): string | null {
    const selectors = [
      '.jobs-description__content',
      '.job-details-jobs-unified-description__content',
      '.description__text',
      '.jobs-description',
      '[data-test-job-details-description]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim().substring(0, 2000);
      }
    }

    return null;
  }

  private extractJobId(url: string): string | undefined {
    // LinkedIn URLs: /jobs/view/1234567890/ or /view/1234567890/
    const match = url.match(/\/view\/(\d+)/);
    if (match) {
      return match[1];
    }

    // Alternative pattern: /jobs/details/1234567890
    const detailsMatch = url.match(/\/details\/(\d+)/);
    if (detailsMatch) {
      return detailsMatch[1];
    }

    return undefined;
  }

  private calculateConfidence(data: { company: string | null; role: string | null; location: string | null; jobDescription: string | null }): number {
    let confidence = 0.5; // Base confidence for LinkedIn

    if (data.company) confidence += 0.15;
    if (data.role) confidence += 0.2;
    if (data.location) confidence += 0.1;
    if (data.jobDescription) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }
}

export const linkedInAdapter = new LinkedInAdapter();
export default LinkedInAdapter;
