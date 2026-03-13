/**
 * Greenhouse Adapter Tests
 * Validates extraction from Greenhouse-powered career pages
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { greenhouseAdapter } from '../../src/content/adapters/greenhouse-adapter';
import { loadFixture } from '../test-utils';

describe('Greenhouse Adapter', () => {
  beforeEach(() => {
    // Reset any adapter state if needed
  });

  test('extracts company from greenhouse page', () => {
    const doc = loadFixture('greenhouse-sample.html');
    const result = greenhouseAdapter.extract(doc);
    
    expect(result.company).toBe('Test Company');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('extracts role/job title', () => {
    const doc = loadFixture('greenhouse-sample.html');
    const result = greenhouseAdapter.extract(doc);
    
    expect(result.role).toBe('Senior Software Engineer');
  });

  test('extracts location', () => {
    const doc = loadFixture('greenhouse-sample.html');
    const result = greenhouseAdapter.extract(doc);
    
    expect(result.location).toBe('San Francisco, CA');
  });

  test('extracts job description', () => {
    const doc = loadFixture('greenhouse-sample.html');
    const result = greenhouseAdapter.extract(doc);
    
    expect(result.jobDescription).toBeDefined();
    expect(result.jobDescription).toContain('talented Software Engineer');
    expect(result.metadata.hasDescription).toBe(true);
  });

  test('provides correct metadata', () => {
    const doc = loadFixture('greenhouse-sample.html');
    const result = greenhouseAdapter.extract(doc);
    
    expect(result.metadata.source).toBe('greenhouse.io');
    expect(result.metadata.platform).toBe('Greenhouse');
    expect(result.metadata.hasLocation).toBe(true);
  });

  test('canHandle returns true for greenhouse job URLs', () => {
    const html = '<!DOCTYPE html><html><body></body></html>';
    const doc = {
      location: { href: 'https://boards.greenhouse.io/company/jobs/12345' },
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;
    
    expect(greenhouseAdapter.canHandle('https://boards.greenhouse.io/company/jobs/12345', doc)).toBe(true);
    expect(greenhouseAdapter.canHandle('https://stripe.greenhouse.io/jobs/12345', doc)).toBe(true);
  });

  test('canHandle returns false for non-greenhouse URLs', () => {
    const doc = {
      location: { href: 'https://example.com/jobs/12345' },
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;
    
    expect(greenhouseAdapter.canHandle('https://example.com/jobs/12345', doc)).toBe(false);
  });
});
