/**
 * Lever Adapter Tests
 * Tests against HTML fixtures for Lever job pages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LeverAdapter } from '../../src/content/adapters/lever-adapter';

const FIXTURES_DIR = join(__dirname, '../fixtures');

/**
 * Helper to load fixture and create document
 */
function loadFixture(filename: string, url: string): Document {
  const html = readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
  const dom = new JSDOM(html, { url });
  return dom.window.document;
}

describe('LeverAdapter', () => {
  let adapter: LeverAdapter;

  beforeAll(() => {
    adapter = new LeverAdapter();
  });

  describe('canHandle', () => {
    it('should handle lever.co job pages', () => {
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890');
      expect(adapter.canHandle('https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890', doc)).toBe(true);
    });

    it('should handle URLs with UUID pattern', () => {
      const urls = [
        'https://jobs.lever.co/company/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'https://jobs.lever.co/startup/12345678-1234-1234-1234-123456789abc',
      ];
      
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/test/12345678-1234-1234-1234-123456789abc');
      
      for (const url of urls) {
        expect(adapter.canHandle(url, doc)).toBe(true);
      }
    });

    it('should not handle non-lever URLs', () => {
      const doc = loadFixture('lever-startup.html', 'https://example.com/jobs/123');
      const urls = [
        'https://greenhouse.io/jobs/123',
        'https://linkedin.com/jobs/view/123',
        'https://example.com/careers',
      ];
      
      for (const url of urls) {
        expect(adapter.canHandle(url, doc)).toBe(false);
      }
    });
  });

  describe('extract', () => {
    it('should extract all fields from lever-startup fixture', () => {
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890');
      const result = adapter.extract(doc);

      expect(result.company).toBe('TechStartup');
      expect(result.role).toBe('Full Stack Engineer');
      expect(result.location).toBe('Remote (US)');
      expect(result.externalJobId).toBe('abcdef12-3456-7890-abcd-ef1234567890');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should extract company from URL when not in DOM', () => {
      // Create a minimal HTML without company name in DOM
      const minimalHtml = `
        <html><body>
          <h1 data-qa="posting-name">Software Engineer</h1>
        </body></html>
      `;
      const dom = new JSDOM(minimalHtml, { 
        url: 'https://jobs.lever.co/some-company/a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
      });
      const result = adapter.extract(dom.window.document);

      expect(result.company).toBe('Some Company');
    });

    it('should parse embedded Lever JSON data', () => {
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890');
      const result = adapter.extract(doc);

      // Should use embedded JSON data
      expect(result.metadata.workplaceType).toBe('remote');
      expect(result.metadata.department).toBe('Engineering');
    });

    it('should include metadata', () => {
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890');
      const result = adapter.extract(doc);

      expect(result.metadata.source).toBe('lever');
      expect(result.metadata.platform).toBe('Lever');
    });

    it('should extract job description', () => {
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890');
      const result = adapter.extract(doc);

      expect(result.jobDescription).toBeDefined();
      expect(result.jobDescription).toContain('About TechStartup');
      expect(result.jobDescription).toContain('What You\'ll Do');
    });
  });

  describe('confidence scoring', () => {
    it('should have high confidence with complete data', () => {
      const doc = loadFixture('lever-startup.html', 'https://jobs.lever.co/techstartup/abcdef12-3456-7890-abcd-ef1234567890');
      const result = adapter.extract(doc);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });
});
