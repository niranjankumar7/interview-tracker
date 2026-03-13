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

export class GreenhouseAdapter implements SiteAdapter {
  domain = '*.greenhouse.io';
  name = 'Greenhouse Adapter';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    const urlObj = new URL(url);
    
    // Check if it's a greenhouse domain
    if (!urlObj.hostname.endsWith('greenhouse.io')) {
      return false;
    }
    
    // Check if it's a job posting page
    const jobPatterns = [
      /\/jobs\/\d+/,           // /jobs/1234567
      /\/job\//,               // /job/...
    ];
    
    return jobPatterns.some(pattern => pattern.test(urlObj.pathname));
  }

  extract(document: Document): ExtractedJobData {
    const url = document.location?.href || '';
    
    // Extract data
    const company = this.extractCompany(document, url);
    const role = this.extractRole(document);
    const location = this.extractLocation(document);
    const jobDescription = this.extractDescription(document);
    const jobId = this.extractJobId(url);

    // Calculate confidence
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
        source: 'greenhouse.io',
        platform: 'Greenhouse',
        hasDescription: !!jobDescription,
        hasLocation: !!location,
      }
    };
  }

  private extractCompany(document: Document, url: string): string | null {
    // Try company name selectors
    const selectors = [
      '.company-name',
      '[data-company-name]',
      '.header-company-name',
      '.gh-header .company',
      // Look in page title as fallback
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) return el.textContent.trim();
    }

    // Try extracting from URL: boards.greenhouse.io/company-name/
    const match = url.match(/boards\.greenhouse\.io\/([^\/]+)/);
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

  private extractRole(document: Document): string | null {
    const selectors = [
      '.app-title',
      '.posting-title',
      'h1.job-title',
      'h1.app-title',
      '.posting-headline h1',
      '[data-testid="job-title"]',
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
      '.location',
      '.job-location',
      '[data-location]',
      '.posting-location',
      '.job-info .location',
      '.app-detail .location',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) return el.textContent.trim();
    }

    return null;
  }

  private extractDescription(document: Document): string | null {
    const selectors = [
      '.content',
      '#content',
      '.job-description',
      '.posting-description',
      '[data-testid="job-description"]',
      '.description',
      '.gh-job-description',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        // Limit to first 2000 characters
        return el.textContent.trim().substring(0, 2000);
      }
    }

    return null;
  }

  private extractJobId(url: string): string | undefined {
    // Greenhouse URLs: /jobs/1234567 or /jobs/1234567-application
    const match = url.match(/\/jobs\/(\d+)/);
    return match ? match[1] : undefined;
  }

  private calculateConfidence(data: { company: string | null; role: string | null; location: string | null; jobDescription: string | null }): number {
    let confidence = 0.5; // Base confidence for Greenhouse

    if (data.company) confidence += 0.15;
    if (data.role) confidence += 0.2;
    if (data.location) confidence += 0.1;
    if (data.jobDescription) confidence += 0.05;

    return Math.min(confidence, 0.98);
  }
}

export const greenhouseAdapter = new GreenhouseAdapter();
export default GreenhouseAdapter;
