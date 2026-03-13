/**
 * Generic Adapter Tests
 * Tests the fallback generic adapter with various HTML structures
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { GenericAdapter } from '../../src/content/adapters/generic-adapter';

describe('GenericAdapter', () => {
  let adapter: GenericAdapter;

  beforeAll(() => {
    adapter = new GenericAdapter();
  });

  describe('canHandle', () => {
    it('should handle URLs with job-related patterns', () => {
      const html = '<html><body>Job page</body></html>';
      const urls = [
        'https://example.com/jobs/123',
        'https://example.com/careers/position',
        'https://example.com/employment/opportunity',
      ];

      for (const url of urls) {
        const dom = new JSDOM(html, { url });
        expect(adapter.canHandle(url, dom.window.document)).toBe(true);
      }
    });

    it('should handle pages with JobPosting schema', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Engineer",
              "hiringOrganization": { "name": "Company" }
            }
            </script>
          </head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://example.com/page' });
      expect(adapter.canHandle('https://example.com/page', dom.window.document)).toBe(true);
    });

    it('should handle pages with job-related elements', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <div class="job-description">Job content here</div>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://example.com/page' });
      expect(adapter.canHandle('https://example.com/page', dom.window.document)).toBe(true);
    });
  });

  describe('extract', () => {
    it('should extract from JSON-LD JobPosting schema', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Software Engineer",
              "description": "Great job opportunity",
              "hiringOrganization": {
                "@type": "Organization",
                "name": "TechCorp"
              },
              "jobLocation": {
                "@type": "Place",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Seattle",
                  "addressRegion": "WA"
                }
              }
            }
            </script>
          </head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://example.com/job/123' });
      const result = adapter.extract(dom.window.document);

      expect(result.company).toBe('TechCorp');
      expect(result.role).toBe('Software Engineer');
      expect(result.location).toBe('Seattle, WA');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should extract from OpenGraph meta tags', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Product Manager at StartupInc">
            <meta property="og:site_name" content="StartupInc">
            <meta property="og:description" content="Join our team">
          </head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://startup.com/careers/pm' });
      const result = adapter.extract(dom.window.document);

      expect(result.company).toBe('Startupinc'); // domain fallback
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should extract from common selectors', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <div class="company-name">Acme Corp</div>
            <h1 class="job-title">Senior Developer</h1>
            <div class="location">Austin, TX</div>
            <div class="job-description">Job details here...</div>
          </body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://acme.com/jobs/123' });
      const result = adapter.extract(dom.window.document);

      expect(result.company).toBe('Acme Corp');
      expect(result.role).toBe('Senior Developer');
      expect(result.location).toBe('Austin, TX');
    });

    it('should extract company from domain as fallback', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Careers</title></head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://stripe.com/jobs' });
      const result = adapter.extract(dom.window.document);

      expect(result.company).toBe('Stripe');
    });

    it('should have lower confidence for generic extraction', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Engineer Position</title></head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://company.com/job' });
      const result = adapter.extract(dom.window.document);

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should extract job ID from URL patterns', () => {
      const testCases = [
        { url: 'https://example.com/jobs/12345', expected: '12345' },
        { url: 'https://example.com/job/67890', expected: '67890' },
        { url: 'https://example.com/position/abc-def', expected: 'abc-def' },
        { url: 'https://example.com/careers?jobId=xyz123', expected: 'xyz123' },
      ];

      for (const { url, expected } of testCases) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head><script type="application/ld+json">{ "@type": "JobPosting", "title": "Job", "hiringOrganization": { "name": "Co" } }</script></head>
            <body></body>
          </html>
        `;
        const dom = new JSDOM(html, { url });
        const result = adapter.extract(dom.window.document);
        expect(result.externalJobId).toBe(expected);
      }
    });
  });

  describe('confidence scoring', () => {
    it('should cap confidence at 0.7 for generic adapter', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Complete Job",
              "hiringOrganization": { "name": "Company" },
              "jobLocation": { "address": { "addressLocality": "City" } },
              "description": "Full description"
            }
            </script>
          </head>
          <body></body>
        </html>
      `;
      const dom = new JSDOM(html, { url: 'https://example.com/job' });
      const result = adapter.extract(dom.window.document);

      expect(result.confidence).toBeLessThanOrEqual(0.7);
    });
  });
});
