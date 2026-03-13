/**
 * Greenhouse Adapter Tests
 * Tests against HTML fixtures for Greenhouse job pages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GreenhouseAdapter } from '../../src/content/adapters/greenhouse-adapter';

const FIXTURES_DIR = join(__dirname, '../fixtures');

/**
 * Helper to load fixture and create document
 */
function loadFixture(filename: string, url: string): Document {
  const html = readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
  const dom = new JSDOM(html, { url });
  return dom.window.document;
}

describe('GreenhouseAdapter', () => {
  let adapter: GreenhouseAdapter;

  beforeAll(() => {
    adapter = new GreenhouseAdapter();
  });

  describe('canHandle', () => {
    it('should handle greenhouse.io subdomains', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://acme.greenhouse.io/jobs/1234567');
      expect(adapter.canHandle('https://acme.greenhouse.io/jobs/1234567', doc)).toBe(true);
    });

    it('should handle various greenhouse URL patterns', () => {
      const urls = [
        'https://stripe.greenhouse.io/jobs/12345',
        'https://shopify.greenhouse.io/jobs/67890',
        'https://company.greenhouse.io/jobs/abc123',
      ];
      
      const doc = loadFixture('greenhouse-acme.html', 'https://test.greenhouse.io/jobs/1');
      
      for (const url of urls) {
        expect(adapter.canHandle(url, doc)).toBe(true);
      }
    });

    it('should not handle non-greenhouse URLs', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://example.com/jobs/123');
      const urls = [
        'https://example.com/jobs/123',
        'https://jobs.lever.co/company/123',
        'https://linkedin.com/jobs/view/123',
      ];
      
      for (const url of urls) {
        expect(adapter.canHandle(url, doc)).toBe(false);
      }
    });
  });

  describe('extract', () => {
    it('should extract all fields from greenhouse-acme fixture', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://acme.greenhouse.io/jobs/1234567');
      const result = adapter.extract(doc);

      expect(result.company).toBe('Acme Inc');
      expect(result.role).toBe('Senior Software Engineer');
      expect(result.location).toBe('San Francisco, CA');
      expect(result.externalJobId).toBe('1234567');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.jobUrl).toBe('https://acme.greenhouse.io/jobs/1234567');
    });

    it('should extract company from subdomain', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://stripe.greenhouse.io/jobs/99999');
      const result = adapter.extract(doc);

      expect(result.company).toBe('Stripe');
    });

    it('should handle hyphenated subdomains', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://acme-corp.greenhouse.io/jobs/12345');
      const result = adapter.extract(doc);

      expect(result.company).toBe('Acme Corp');
    });

    it('should include metadata', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://acme.greenhouse.io/jobs/1234567');
      const result = adapter.extract(doc);

      expect(result.metadata.source).toBe('greenhouse');
      expect(result.metadata.platform).toBe('Greenhouse');
      expect(result.metadata.department).toBe('Engineering');
    });

    it('should extract job description', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://acme.greenhouse.io/jobs/1234567');
      const result = adapter.extract(doc);

      expect(result.jobDescription).toBeDefined();
      expect(result.jobDescription).toContain('About the Role');
      expect(result.jobDescription).toContain('Requirements');
    });
  });

  describe('confidence scoring', () => {
    it('should have high confidence with complete data', () => {
      const doc = loadFixture('greenhouse-acme.html', 'https://acme.greenhouse.io/jobs/1234567');
      const result = adapter.extract(doc);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });
});
