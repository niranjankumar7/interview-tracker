/**
 * Lever Adapter Tests
 * Validates extraction from Lever-powered career pages
 */

import { describe, test, expect } from 'vitest';
import { leverAdapter } from '../../src/content/adapters/lever-adapter';
import { loadFixture } from '../test-utils';

describe('Lever Adapter', () => {
  test('extracts company from lever page', () => {
    const doc = loadFixture('lever-sample.html');
    const result = leverAdapter.extract(doc);
    
    expect(result.company).toBe('Test Startup');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('extracts role/job title', () => {
    const doc = loadFixture('lever-sample.html');
    const result = leverAdapter.extract(doc);
    
    expect(result.role).toBe('Senior Product Manager');
  });

  test('extracts location', () => {
    const doc = loadFixture('lever-sample.html');
    const result = leverAdapter.extract(doc);
    
    expect(result.location).toBe('New York, NY');
  });

  test('extracts job description', () => {
    const doc = loadFixture('lever-sample.html');
    const result = leverAdapter.extract(doc);
    
    expect(result.jobDescription).toBeDefined();
    expect(result.metadata.hasDescription).toBe(true);
  });

  test('provides correct metadata', () => {
    const doc = loadFixture('lever-sample.html');
    const result = leverAdapter.extract(doc);
    
    expect(result.metadata.source).toBe('jobs.lever.co');
    expect(result.metadata.platform).toBe('Lever');
    expect(result.metadata.hasLocation).toBe(true);
  });

  test('canHandle returns true for lever job URLs', () => {
    const doc = {
      location: { href: 'https://jobs.lever.co/company/12345678-1234-1234-1234-123456789abc' },
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;
    
    expect(leverAdapter.canHandle('https://jobs.lever.co/company/12345678-1234-1234-1234-123456789abc', doc)).toBe(true);
  });

  test('canHandle returns false for non-lever URLs', () => {
    const doc = {
      location: { href: 'https://example.com/jobs/12345' },
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;
    
    expect(leverAdapter.canHandle('https://example.com/jobs/12345', doc)).toBe(false);
  });
});
