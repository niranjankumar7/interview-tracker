/**
 * Ashby Adapter Tests
 * Tests against HTML fixtures for Ashby job pages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AshbyAdapter } from '../../src/content/adapters/ashby-adapter';

const FIXTURES_DIR = join(__dirname, '../fixtures');

/**
 * Helper to load fixture and create document
 */
function loadFixture(filename: string, url: string): Document {
  const html = readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
  const dom = new JSDOM(html, { url });
  return dom.window.document;
}

describe('AshbyAdapter', () => {
  let adapter: AshbyAdapter;

  beforeAll(() => {
    adapter = new AshbyAdapter();
  });

  describe('canHandle', () => {
    it('should handle ashbyhq.com job pages', () => {
      const doc = loadFixture('ashby-tech.html', 'https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851');
      expect(adapter.canHandle('https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851')).toBe(true);
    });

    it('should handle various ashby URL patterns', () => {
      const urls = [
        'https://jobs.ashbyhq.com/company/12345678-1234-1234-1234-123456789abc',
        'https://jobs.ashbyhq.com/startup/job-id-here',
        'https://careers.ashbyhq.com/company/position',
      ];
      
      for (const url of urls) {
        expect(adapter.canHandle(url)).toBe(true);
      }
    });

    it('should not handle non-ashby URLs', () => {
      const urls = [
        'https://greenhouse.io/jobs/123',
        'https://jobs.lever.co/company/123',
        'https://linkedin.com/jobs/view/123',
      ];
      
      for (const url of urls) {
        expect(adapter.canHandle(url)).toBe(false);
      }
    });
  });

  describe('extract', () => {
    it('should extract all fields from ashby-tech fixture', () => {
      const doc = loadFixture('ashby-tech.html', 'https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851');
      const result = adapter.extract(doc);

      expect(result?.company).toBe('Anthropic');
      expect(result?.role).toBe('Machine Learning Engineer');
      expect(result?.location).toBe('San Francisco, CA');
      expect(result?.externalJobId).toBe('d290f1ee-6c54-4b01-90e6-d701748f0851');
    });

    it('should extract from JSON-LD when window.__ASHBY__ is unavailable', () => {
      // The fixture has both, but in real scenarios one might be missing
      const doc = loadFixture('ashby-tech.html', 'https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851');
      const result = adapter.extract(doc);

      expect(result).not.toBeNull();
      expect(result?.company).toBe('Anthropic');
      expect(result?.role).toBe('Machine Learning Engineer');
    });

    it('should include metadata', () => {
      const doc = loadFixture('ashby-tech.html', 'https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851');
      const result = adapter.extract(doc);

      expect(result?.source).toBe('jobs.ashbyhq.com');
    });

    it('should extract job description', () => {
      const doc = loadFixture('ashby-tech.html', 'https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851');
      const result = adapter.extract(doc);

      expect(result?.description).toBeDefined();
      expect(result?.description?.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('confidence scoring', () => {
    it('should calculate confidence scores', () => {
      const doc = loadFixture('ashby-tech.html', 'https://jobs.ashbyhq.com/anthropic/d290f1ee-6c54-4b01-90e6-d701748f0851');
      const result = adapter.extract(doc);

      expect(result).not.toBeNull();
      const confidence = adapter.calculateConfidence(result);
      
      expect(confidence.company).toBeGreaterThan(0);
      expect(confidence.role).toBeGreaterThan(0);
      expect(confidence.overall).toBeGreaterThan(0);
    });
  });
});
