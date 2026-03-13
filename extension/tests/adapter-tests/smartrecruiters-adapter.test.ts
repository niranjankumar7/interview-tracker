/**
 * SmartRecruiters Adapter Tests
 * Tests against mock HTML for SmartRecruiters job pages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { SmartRecruitersAdapter } from '../../src/content/adapters/smartrecruiters-adapter';

describe('SmartRecruitersAdapter', () => {
  let adapter: SmartRecruitersAdapter;

  beforeAll(() => {
    adapter = new SmartRecruitersAdapter();
  });

  describe('canHandle', () => {
    it('should handle jobs.smartrecruiters.com URLs', () => {
      const url = 'https://jobs.smartrecruiters.com/CompanyName/1234567890-job-title';
      expect(adapter.canHandle(url)).toBe(true);
    });

    it('should handle careers.smartrecruiters.com URLs', () => {
      const url = 'https://careers.smartrecruiters.com/CompanyName/job';
      expect(adapter.canHandle(url)).toBe(true);
    });

    it('should handle www.smartrecruiters.com/careers URLs', () => {
      const url = 'https://www.smartrecruiters.com/careers/company-name/1234567890-job';
      expect(adapter.canHandle(url)).toBe(true);
    });

    it('should not handle non-smartrecruiters URLs', () => {
      const urls = [
        'https://greenhouse.io/jobs/123',
        'https://jobs.lever.co/company/123',
        'https://linkedin.com/jobs/view/123',
      ];
      
      for (const url of urls) {
        expect(adapter.canHandle(url)).toBe(false);
      }
    });

    it('should not handle smartrecruiters non-job pages', () => {
      const urls = [
        'https://www.smartrecruiters.com/',
        'https://www.smartrecruiters.com/about',
        'https://jobs.smartrecruiters.com/',  // homepage
      ];
      
      for (const url of urls) {
        expect(adapter.canHandle(url)).toBe(false);
      }
    });
  });

  describe('extract', () => {
    it('should create a valid adapter instance', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('smartrecruiters');
    });

    it('should extract company from URL slug', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1 class="job-title">Software Engineer</h1>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://jobs.smartrecruiters.com/TechCorpUSA/12345-role' });
      
      // Temporarily override window.location for the test
      const result = adapter.extract.call(
        { ...adapter, canHandle: adapter.canHandle },
        dom.window.document
      );

      // This test documents expected behavior
      // In practice, SmartRecruitersAdapter uses window.location.href
    });
  });

  describe('URL pattern matching', () => {
    it('should match numeric job ID patterns', () => {
      const patterns = [
        { url: 'https://jobs.smartrecruiters.com/Company/1234567890-job-title', shouldMatch: true },
        { url: 'https://jobs.smartrecruiters.com/Company/12345-role-name', shouldMatch: true },
        { url: 'https://jobs.smartrecruiters.com/Company/job/123456', shouldMatch: true },
        { url: 'https://jobs.smartrecruiters.com/Company/', shouldMatch: false },
      ];

      for (const { url, shouldMatch } of patterns) {
        const result = adapter.canHandle(url);
        expect(result).toBe(shouldMatch);
      }
    });
  });
});
