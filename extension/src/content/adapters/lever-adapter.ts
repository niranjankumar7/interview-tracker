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

// Lever job data interface from embedded JSON
interface LeverJobData {
  id?: string;
  title?: string;
  team?: string;
  location?: string;
  workplaceType?: string;
  commitment?: string;
  company?: string;
}

export class LeverAdapter implements SiteAdapter {
  domain = '*.lever.co';
  name = 'Lever Adapter';
  version = '1.0.0';

  /**
   * Check if this is a Lever job page
   */
  canHandle(url: string, document: Document): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must be on lever.co domain
      if (!urlObj.hostname.endsWith('.lever.co')) {
        return false;
      }
      
      // Must be a job detail page (has UUID pattern) or careers page with job listing
      const isJobPage = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(urlObj.pathname);
      const hasJobContent = document.querySelector('[data-qa="posting-name"]') !== null ||
                           document.querySelector('.posting') !== null;
      
      return isJobPage || hasJobContent;
    } catch {
      return false;
    }
  }

  /**
   * Try to get job data from Lever's embedded JSON
   */
  private getLeverJobData(): LeverJobData | null {
    const script = document.querySelector('script[data-lever-job-data]');
    if (script) {
      try {
        return JSON.parse(script.textContent || '{}') as LeverJobData;
      } catch {
        // Invalid JSON, fall through
      }
    }

    // Try to find JSON in script tags
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        if (data.id && (data.title || data.team)) {
          return data as LeverJobData;
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return null;
  }

  /**
   * Extract job data from Lever page
   */
  extract(document: Document): ExtractedJobData {
    const url = document.location?.href || '';
    let confidence = 0.6;

    // Try to get structured data first
    const leverData = this.getLeverJobData();

    // Extract company
    const company = this.extractCompany(document, url, leverData);

    // Extract role
    const role = this.extractRole(document, leverData);

    // Extract location
    const location = this.extractLocation(document, leverData);

    // Extract job description
    const jobDescription = this.extractJobDescription(document);

    // Extract job ID from URL
    const externalJobId = this.extractJobId(url, leverData);

    // Extract department/team
    const department = this.extractDepartment(document, leverData);

    // Update confidence based on what we found
    if (role) confidence += 0.15;
    if (location) confidence += 0.1;
    if (jobDescription) confidence += 0.1;
    if (leverData) confidence += 0.15;

    return {
      company: company || 'Unknown Company',
      role: role || 'Unknown Position',
      location: location || undefined,
      jobUrl: url,
      jobDescription: jobDescription || undefined,
      externalJobId: externalJobId || undefined,
      confidence: Math.min(confidence, 0.95),
      metadata: {
        source: 'lever',
        platform: 'Lever',
        department,
        workplaceType: leverData?.workplaceType
      }
    };
  }

  private extractCompany(document: Document, url: string, leverData: LeverJobData | null): string | null {
    // Try embedded data first
    if (leverData?.company) {
      return leverData.company;
    }

    // Try DOM selectors
    const selectors = [
      '.company-name',
      '.main-header .company-name',
      '.lever-jobs-page .company-name',
      'header .company-name'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim();
      }
    }

    // Extract from URL: jobs.lever.co/company-name/...
    const match = url.match(/jobs\.lever\.co\/([^\/]+)/);
    if (match) {
      // Convert slug to readable name
      return match[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    // Try meta tags
    const metaOrg = document.querySelector('meta[property="og:site_name"]');
    if (metaOrg) {
      const content = metaOrg.getAttribute('content');
      if (content) return content;
    }

    return null;
  }

  private extractRole(document: Document, leverData: LeverJobData | null): string | null {
    // Try embedded data first
    if (leverData?.title) {
      return leverData.title;
    }

    // Try DOM selectors
    const selectors = [
      'h1[data-qa="posting-name"]',
      '.posting-header h1',
      '.posting h1',
      '.job-title',
      'h1'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim();
      }
    }

    return null;
  }

  private extractLocation(document: Document, leverData: LeverJobData | null): string | null {
    // Try embedded data first
    if (leverData?.location) {
      return leverData.location;
    }

    // Try DOM selectors - Lever often has multiple categories
    const selectors = [
      '.posting-categories span:nth-child(2)',
      '.sort-by-team.posting-category',
      '.posting-category:not(.medium-category:first-child)',
      '.location',
      '.job-location'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        const text = el.textContent.trim();
        // Filter out department names (common Lever pattern)
        if (!['Engineering', 'Product', 'Design', 'Sales', 'Marketing'].includes(text)) {
          return text;
        }
      }
    }

    return null;
  }

  private extractDepartment(document: Document, leverData: LeverJobData | null): string | null {
    // Try embedded data first
    if (leverData?.team) {
      return leverData.team;
    }

    // Try first category span (usually department in Lever)
    const selectors = [
      '.posting-categories span:first-child',
      '.sort-by-time.posting-category',
      '.department'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim();
      }
    }

    return null;
  }

  private extractJobDescription(document: Document): string | null {
    const selectors = [
      '.posting-description[data-qa="job-description"]',
      '.posting-description',
      '[data-qa="job-description"]',
      '.job-description',
      '.description'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim().substring(0, 2000);
      }
    }

    return null;
  }

  private extractJobId(url: string, leverData: LeverJobData | null): string | null {
    // Try embedded data first
    if (leverData?.id) {
      return leverData.id;
    }

    // Lever uses UUID-style job IDs in URL
    const match = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    return match ? match[1] : null;
  }
}

/**
 * Singleton instance
 */
export const leverAdapter = new LeverAdapter();

export default LeverAdapter;
